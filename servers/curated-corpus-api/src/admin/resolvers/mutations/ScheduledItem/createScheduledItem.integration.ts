import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ActionScreen, ScheduledItemSource } from 'content-common';

import { client } from '../../../../database/client';
import {
  clearDb,
  createApprovedItemHelper,
  createExcludedDomainHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { CREATE_SCHEDULED_ITEM } from '../sample-mutations.gql';
import { CreateScheduledItemApiInput } from '../../types';
import { getUnixTimestamp } from '../../fields/UnixTimestamp';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ScheduledCorpusItemEventType } from '../../../../events/types';
import { DateTime } from 'luxon';
import {
  ACCESS_DENIED_ERROR,
  ManualScheduleReason,
} from '../../../../shared/types';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import { toUtcDateString } from '../../../../shared/utils';

describe('mutations: ScheduledItem (createScheduledItem)', () => {
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
  it('should fail on invalid Scheduled Surface GUID', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'RECSAPI',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();
    expect(result.body.errors).not.toBeUndefined();

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a scheduled entry with Scheduled Surface GUID of "RECSAPI".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // Check that the ADD_SCHEDULE event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail on invalid Approved Item ID', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: 'not-a-valid-id-at-all',
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a scheduled entry: Approved Item with id "not-a-valid-id-at-all" does not exist.`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // Check that the ADD_SCHEDULE event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail if story is already scheduled for given Scheduled Surface/date combination', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    // create a sample curated item
    const item = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    // create a scheduled entry for this item
    const existingScheduledEntry = await createScheduledItemHelper(db, {
      approvedItem: item,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    });

    // This is the date format for the GraphQL mutation.
    const scheduledDate = DateTime.fromJSDate(
      existingScheduledEntry.scheduledDate,
      { zone: 'utc' },
    ).toFormat('yyyy-MM-dd');

    // And this human-readable (and cross-locale understandable) format
    // is used in the error message we're anticipating to get.
    const displayDate = DateTime.fromJSDate(
      existingScheduledEntry.scheduledDate,
      { zone: 'utc' },
    ).toFormat('MMM d, y');

    // Set up the input for the mutation that contains the exact same values
    // as the scheduled entry created above.
    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: item.externalId,
      scheduledSurfaceGuid: existingScheduledEntry.scheduledSurfaceGuid,
      scheduledDate,
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();
    // Expecting to see a custom error message from the resolver
    expect(result.body.errors?.[0].message).toContain(
      `This story is already scheduled to appear on NEW_TAB_EN_US on ${displayDate}.`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual(
      'ALREADY_SCHEDULED',
    );

    // Check that the ADD_SCHEDULE event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should create an entry and send along the action screen to analytics', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    // Make sure excluded domains list contains some entries so that we know
    // checking against this list is successful because the approved item's domain
    // is not on the list, and not because the list is empty.
    await createExcludedDomainHelper(db, { domainName: 'excludeme.com' });
    await createExcludedDomainHelper(db, { domainName: 'test.com' });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
      actionScreen: ActionScreen.SCHEDULE,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).not.toBeNull();
    expect(result.body.errors).toBeUndefined();

    // Check that the ADD_SCHEDULE event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    const addScheduleEventCall = await eventTracker.mock.calls[0][0];

    // 2 - Event has the right type.
    expect(addScheduleEventCall.eventType).toEqual(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
    );
    // 3- Event has the right entity passed to it.
    expect(addScheduleEventCall.scheduledCorpusItem.action_screen).toEqual(
      input.actionScreen,
    );
  });

  it('should create an entry and return data (including Approved Item)', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    const scheduledItem = result.body.data?.createScheduledCorpusItem;

    // Expect these fields to return valid values
    expect(scheduledItem.externalId).not.toBeNull();
    expect(scheduledItem.createdAt).not.toBeNull();
    expect(scheduledItem.updatedAt).not.toBeNull();
    expect(scheduledItem.createdBy).toEqual(headers.username);
    expect(scheduledItem.source).toEqual(ScheduledItemSource.MANUAL);

    // Expect these to match the input values
    expect(new Date(scheduledItem.scheduledDate)).toStrictEqual(
      new Date(input.scheduledDate),
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
    } = scheduledItem.approvedItem;
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

    // Check that the ADD_SCHEDULE event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].scheduledCorpusItem.externalId,
    ).toEqual(scheduledItem.externalId);
  });

  it('should create a TrustedDomain if the domain does have a past scheduled date', async () => {
    const pastApprovedItem = await createApprovedItemHelper(db, {
      url: 'https://example.com/article1',
      title: 'Article 1',
    });

    // create a scheduled entry in the past for this item
    await createScheduledItemHelper(db, {
      approvedItem: pastApprovedItem,
      scheduledDate: new Date(2024, 1, 1).toISOString(),
    });

    const newApprovedItem = await createApprovedItemHelper(db, {
      url: 'https://example.com/article2',
      title: 'Article 2',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: newApprovedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: toUtcDateString(new Date()),
      source: ScheduledItemSource.ML,
    };

    await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    // Check that example.com exists as a TrustedDomain in the database.
    const trustedDomain = await db.trustedDomain.findUnique({
      where: { domainName: 'example.com' },
    });
    expect(trustedDomain).toBeTruthy();
  });

  it('should not create a TrustedDomain if the domain does not have a past scheduled date', async () => {
    const approvedItem = await createApprovedItemHelper(db, {
      url: 'https://example.com/article1',
      title: 'Article 1',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: toUtcDateString(new Date()),
      source: ScheduledItemSource.ML,
    };

    await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    // Check that example.com does not exist as a TrustedDomain in the database.
    const trustedDomain = await db.trustedDomain.findUnique({
      where: { domainName: 'example.com' },
    });
    expect(trustedDomain).toBeNull();
  });

  it('should not schedule a story if the domain is on the list of excluded domains', async () => {
    await createExcludedDomainHelper(db, { domainName: 'excludeme.com' });
    await createExcludedDomainHelper(db, { domainName: 'test.com' });

    const approvedItem = await createApprovedItemHelper(db, {
      url: 'https://excludeme.com/story/thats-a-no',
      title: 'Please do not publish me here',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: toUtcDateString(new Date()),
      source: ScheduledItemSource.ML,
    };

    // Run the mutation
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();

    // And there is an access denied error
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].message).toEqual(
      'Cannot schedule this story: "excludeme.com" is on the excluded domains list.',
    );
  });

  it('should fail if user has read-only access', async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
    };

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'A test story',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
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
      title: 'A test story',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
      reasons: `${ManualScheduleReason.EVERGREEN},${ManualScheduleReason.PUBLISHER_DIVERSITY}`,
      reasonComment: 'i scheduled this because i thought it would be nice',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
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
      title: 'A test story',
    });

    const input: CreateScheduledItemApiInput = {
      approvedItemExternalId: approvedItem.externalId,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
      source: ScheduledItemSource.MANUAL,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULED_ITEM),
        variables: { data: input },
      });

    // Hooray! There is data
    expect(result.body.data).not.toBeNull();

    // And no errors, too!
    expect(result.body.errors).toBeUndefined();
  });
});
