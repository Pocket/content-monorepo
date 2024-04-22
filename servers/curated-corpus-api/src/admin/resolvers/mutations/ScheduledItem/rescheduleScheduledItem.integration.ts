import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ActionScreen, ScheduledItemSource } from 'content-common';

import { client } from '../../../../database/client';
import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { RESCHEDULE_SCHEDULED_ITEM } from '../sample-mutations.gql';
import { RescheduleScheduledItemApiInput } from '../../types';
import { getUnixTimestamp } from '../../fields/UnixTimestamp';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ScheduledCorpusItemEventType } from '../../../../events/types';
import {
  ACCESS_DENIED_ERROR,
  MozillaAccessGroup,
  ScheduledCorpusItemStatus,
} from '../../../../shared/types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ScheduledItem (rescheduleScheduledCorpusItem)', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeEach(async () => {
    await clearDb(db);
  });
  it('should fail on invalid external ID', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

    const input: RescheduleScheduledItemApiInput = {
      externalId: 'not-a-valid-ID-string',
      scheduledDate: '2025-05-05',
      source: ScheduledItemSource.MANUAL,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Item with ID of '${input.externalId}' could not be found.`,
    );

    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // Check that the REMOVE_SCHEDULE event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should reschedule an item and return updated data', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();

    eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      scheduledDate: new Date(2050, 4, 4).toISOString(),
      source: ScheduledItemSource.ML,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            scheduledDate: '2050-05-05',
            source: ScheduledItemSource.MANUAL,
          },
        },
      });

    // The shape of the Prisma objects the above helpers return doesn't quite match
    // the type we return in GraphQL (for example, IDs stay internal, we attach an
    // ApprovedItem), so until there is a query to retrieve the scheduled item
    // of the right shape (if it's ever implemented), laborious property-by-property
    // comparison is the go.
    const returnedItem = result.body.data?.rescheduleScheduledCorpusItem;

    // on reschedule for a different day, a new externalId/db row is generated
    expect(returnedItem.externalId).not.toEqual(scheduledItem.externalId);
    expect(returnedItem.externalId).toBeTruthy();
    // createdBy will be changed to the entity performing the reschedule
    expect(returnedItem.createdBy).toEqual(headers.username);
    // MANUAL was specified in the API call above
    expect(returnedItem.source).toEqual(ScheduledItemSource.MANUAL);

    // as a new db row is created, the createdAt value on that row should be
    // *after* the createdAt of the originally scheduled item
    expect(returnedItem.createdAt).toBeGreaterThan(
      getUnixTimestamp(scheduledItem.createdAt),
    );

    expect(returnedItem.scheduledDate).toEqual('2050-05-05');

    // Finally, let's compare the returned ApprovedItem object to our inputs.
    // Need to destructure timestamps and compare them separately
    // as Prisma will convert to ISO string for comparison
    // and GraphQL server returns Unix timestamps.
    const {
      createdAt,
      updatedAt,
      authors: approvedItemAuthors,
      ...otherApprovedItemProps
    } = approvedItem;
    const {
      createdAt: createdAtReturned,
      updatedAt: updatedAtReturned,
      authors: authorsReturned,
      ...otherReturnedApprovedItemProps
    } = returnedItem.approvedItem;
    expect(getUnixTimestamp(createdAt)).toEqual(createdAtReturned);
    expect(getUnixTimestamp(updatedAt)).toEqual(updatedAtReturned);
    expect(otherApprovedItemProps).toMatchObject(
      otherReturnedApprovedItemProps,
    );

    // check authors
    // note that approvedItemAuthors does not go through our graphql interface,
    // so it has *all* db properties, including externalId and approvedItemId.
    // these properties are *not* present in authorsReturned, so we need to do
    // a custom comparison
    if (approvedItemAuthors) {
      const approvedItemAuthorsMapped = approvedItemAuthors.map((aia) => {
        return {
          name: aia.name,
          sortOrder: aia.sortOrder,
        };
      });

      expect(approvedItemAuthorsMapped).toStrictEqual(authorsReturned);
    }

    // Check that the RESCHEDULE event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ScheduledCorpusItemEventType.RESCHEDULE,
    );

    // full analytics call data verified in a test below
  });

  it('should reschedule an item for the same date without creating a new externalID or emitting an analytics event', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();

    eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      // javascript uses 0-based month array, so this is really april 4th
      scheduledDate: new Date(2050, 3, 4).toISOString(),
      source: ScheduledItemSource.ML,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            // rescheduled for the same date!
            scheduledDate: '2050-04-04',
            source: ScheduledItemSource.MANUAL,
            actionScreen: ActionScreen.SCHEDULE,
          },
        },
      });

    const returnedItem = result.body.data?.rescheduleScheduledCorpusItem;

    // the date should not have been changed
    expect(returnedItem.scheduledDate).toEqual('2050-04-04');

    // the external id should not have been changed either
    expect(returnedItem.externalId).toEqual(scheduledItem.externalId);

    // Check that the RESCHEDULE event was not fired, because scheduledDate is unchanged:
    expect(eventTracker).not.toHaveBeenCalled();
  });

  it('should reschedule an item and send along analytics values', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();

    eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      scheduledDate: new Date(2050, 4, 4).toISOString(),
      source: ScheduledItemSource.ML,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            scheduledDate: '2050-05-05',
            source: ScheduledItemSource.MANUAL,
            actionScreen: ActionScreen.SCHEDULE,
          },
        },
      });

    // minimal check to make sure the call succeeded
    expect(result.body.data).not.toBeNull();
    expect(result.body.errors).toBeUndefined();

    // Check that the RESCHEDULE event was fired successfully:

    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    const rescheduleEventCall = await eventTracker.mock.calls[0][0];

    // 2 - Event has the right type.
    expect(rescheduleEventCall.eventType).toEqual(
      ScheduledCorpusItemEventType.RESCHEDULE,
    );

    // 3- Event has the right values
    expect(rescheduleEventCall.scheduledCorpusItem.action_screen).toEqual(
      ActionScreen.SCHEDULE,
    );

    expect(rescheduleEventCall.scheduledCorpusItem.generated_by).toEqual(
      ScheduledItemSource.MANUAL,
    );

    expect(rescheduleEventCall.scheduledCorpusItem.status).toEqual(
      ScheduledCorpusItemStatus.RESCHEDULED,
    );

    // a new externalId should have been generated
    expect(rescheduleEventCall.scheduledCorpusItem.externalId).toBeTruthy();
    expect(rescheduleEventCall.scheduledCorpusItem.externalId).not.toEqual(
      scheduledItem.externalId,
    );

    // the original externalId should be sent as well
    expect(
      rescheduleEventCall.scheduledCorpusItem
        .original_scheduled_corpus_item_external_id,
    ).toEqual(scheduledItem.externalId);
  });

  it('should fail if story is already scheduled for given Scheduled Surface/date combination', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

    // create a sample curated item
    const item = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    // create two scheduled entries for this item
    await createScheduledItemHelper(db, {
      approvedItem: item,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: new Date(2050, 4, 4).toISOString(),
    });

    const existingScheduledEntry2 = await createScheduledItemHelper(db, {
      approvedItem: item,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: new Date(2050, 4, 5).toISOString(),
      source: ScheduledItemSource.MANUAL,
    });

    // try to reschedule the second entry for the same date as the first
    const input: RescheduleScheduledItemApiInput = {
      externalId: existingScheduledEntry2.externalId,
      scheduledDate: '2050-05-04',
      source: ScheduledItemSource.MANUAL,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();

    expect(result.body.errors?.[0].extensions?.code).toEqual(
      'ALREADY_SCHEDULED',
    );

    // Check that the ADD_SCHEDULE event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail if user has read-only access', async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
    };

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      scheduledDate: new Date(2050, 4, 4).toISOString(),
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            scheduledDate: '2050-05-05',
            source: ScheduledItemSource.MANUAL,
          },
        },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();

    expect(result.body.errors).not.toBeUndefined();

    // And there is an access denied error
    expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
  });

  it("should fail if user doesn't have access to specified scheduled surface", async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
    };

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      scheduledDate: new Date(2050, 4, 4).toISOString(),
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            scheduledDate: '2050-05-05',
            source: ScheduledItemSource.MANUAL,
          },
        },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();

    expect(result.body.errors).not.toBeUndefined();

    // And there is an access denied error
    expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
  });

  it('should succeed if user has access to specified scheduled surface', async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
    };

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
      scheduledDate: new Date(2050, 4, 4).toISOString(),
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(RESCHEDULE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            scheduledDate: '2050-05-05',
            source: ScheduledItemSource.MANUAL,
          },
        },
      });

    // Hooray! There is data
    expect(result.body.data).not.toBeNull();

    // And no errors, too!
    expect(result.body.errors).toBeUndefined();
  });
});
