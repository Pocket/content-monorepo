import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ActionScreen } from 'content-common';

import { client } from '../../../../database/client';
import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { DELETE_SCHEDULED_ITEM } from '../sample-mutations.gql';
import { DeleteScheduledItemInput } from '../../../../database/types';
import { getUnixTimestamp } from '../../../../shared/resolvers/fields/UnixTimestamp';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ScheduledCorpusItemEventType } from '../../../../events/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ScheduledItem (deleteScheduledItem)', () => {
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
    eventEmitter.on(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, eventTracker);

    const input: DeleteScheduledItemInput = {
      externalId: 'not-a-valid-ID-string',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
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

  it('should delete an item scheduled for a Scheduled Surface and return deleted data', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            reasons: 'PUBLISHER,TOPIC',
            reasonComment: 'test comment',
          },
        },
      });

    // The shape of the Prisma objects the above helpers return doesn't quite match
    // the type we return in GraphQL (for example, IDs stay internal, we attach an
    // ApprovedItem), so until there is a query to retrieve the scheduled item
    // of the right shape (if it's ever implemented), laborious property-by-property
    // comparison is the go.
    const returnedItem = result.body.data?.deleteScheduledCorpusItem;

    expect(returnedItem.externalId).toEqual(scheduledItem.externalId);
    expect(returnedItem.createdBy).toEqual(scheduledItem.createdBy);
    expect(returnedItem.updatedBy).toEqual(headers.username);

    expect(returnedItem.createdAt).toEqual(
      getUnixTimestamp(scheduledItem.createdAt),
    );
    expect(returnedItem.updatedAt).toBeCloseTo(
      getUnixTimestamp(scheduledItem.updatedAt),
      -1, // allows for a difference of 10^-1 / 2 = 5 seconds
    );

    expect(new Date(returnedItem.scheduledDate)).toStrictEqual(
      scheduledItem.scheduledDate,
    );

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
      hasTrustedDomain,
      ...otherReturnedApprovedItemProps
    } = returnedItem.approvedItem;
    expect(getUnixTimestamp(createdAt)).toEqual(createdAtReturned);
    expect(getUnixTimestamp(updatedAt)).toEqual(updatedAtReturned);
    expect(hasTrustedDomain).toStrictEqual(false);
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

    // Check that the REMOVE_SCHEDULE event was fired successfully:

    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    );

    // full analytics data test happens below
  });

  it('should delete a scheduled item and send all expected analytics data', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'This is a test',
    });

    const scheduledItem = await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
        variables: {
          data: {
            externalId: scheduledItem.externalId,
            reasons: 'PUBLISHER,TOPIC',
            reasonComment: 'test comment',
            // analytics value!
            actionScreen: ActionScreen.SCHEDULE,
          },
        },
      });

    // minimal check to make sure the call executed successfully
    expect(result.body.data).not.toBeNull();
    expect(result.body.errors).toBeUndefined();

    // Check that the REMOVE_SCHEDULE event was fired successfully:

    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    const removeScheduleEventCall = await eventTracker.mock.calls[0][0];

    // 2 - Event has the right type.
    expect(removeScheduleEventCall.eventType).toEqual(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    );

    // 3- correct data was passed
    expect(removeScheduleEventCall.scheduledCorpusItem.action_screen).toEqual(
      ActionScreen.SCHEDULE,
    );

    expect(removeScheduleEventCall.scheduledCorpusItem.generated_by).toEqual(
      scheduledItem.source,
    );

    // externalId is set in real time and is not persisted. the important
    // things to test are that it's present and not equal to the externalId
    // of the record that was deleted from the db.
    expect(
      removeScheduleEventCall.scheduledCorpusItem.externalId,
    ).not.toBeFalsy();

    expect(removeScheduleEventCall.scheduledCorpusItem.externalId).not.toEqual(
      scheduledItem.externalId,
    );

    expect(
      removeScheduleEventCall.scheduledCorpusItem
        .original_scheduled_corpus_item_external_id,
    ).toEqual(scheduledItem.externalId);

    // this is probably wrong and needs to be converted to an array?
    expect(removeScheduleEventCall.scheduledCorpusItem.reasons).toEqual([
      'PUBLISHER',
      'TOPIC',
    ]);

    expect(removeScheduleEventCall.scheduledCorpusItem.reasonComment).toEqual(
      'test comment',
    );
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
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
        variables: { data: { externalId: scheduledItem.externalId } },
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
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
        variables: { data: { externalId: scheduledItem.externalId } },
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
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_SCHEDULED_ITEM),
        variables: { data: { externalId: scheduledItem.externalId } },
      });

    // Hooray! There is data
    expect(result.body.data).not.toBeNull();

    // And no errors, too!
    expect(result.body.errors).toBeUndefined();
  });
});
