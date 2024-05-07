import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActionScreen,
  CreateApprovedCorpusItemApiInput,
  CorpusItemSource,
  CuratedStatus,
  ScheduledItemSource,
  Topics,
} from 'content-common';

import { client } from '../../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createRejectedCuratedCorpusItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { CREATE_APPROVED_ITEM } from '../sample-mutations.gql';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import {
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
} from '../../../../events/types';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem (createApprovedCorpusItem)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: CreateApprovedCorpusItemApiInput;
  let server: ApolloServer<IAdminContext>;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

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

  beforeEach(async () => {
    await clearDb(db);

    // reset input before each test (as tests may manipulate this value)
    input = {
      prospectId: '123-abc',
      title: 'Find Out How I Cured My Docker In 2 Days',
      url: 'https://test.com/docker',
      excerpt: 'A short summary of what this story is about',
      authors: [{ name: 'Mary Shelley', sortOrder: 1 }],
      status: CuratedStatus.CORPUS,
      imageUrl: 'https://test.com/image.png',
      language: 'DE',
      publisher: 'Convective Cloud',
      datePublished: '2024-02-29',
      topic: Topics.TECHNOLOGY,
      source: CorpusItemSource.PROSPECT,
      isCollection: false,
      isTimeSensitive: true,
      isSyndicated: false,
    };
  });

  it('should create an approved item if user has full access', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation
    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(input);

    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(result.body.data?.createApprovedCorpusItem.createdBy).toEqual(
      headers.username,
    );

    // Check that the ADD_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.ADD_ITEM,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(result.body.data?.createApprovedCorpusItem.externalId);
  });

  it('should create an approved item without a prospectId', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // clone the input
    const inputWithoutProspectId = { ...input };

    // delete the prospectId (as it will not be sent from the frontend for manually added items)
    delete inputWithoutProspectId.prospectId;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: inputWithoutProspectId },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation
    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(
      inputWithoutProspectId,
    );

    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(result.body.data?.createApprovedCorpusItem.createdBy).toEqual(
      headers.username,
    );

    // Check that the ADD_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.ADD_ITEM,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(result.body.data?.createApprovedCorpusItem.externalId);
  });

  it('should create an approved item without a publication date', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // clone the input
    const inputWithoutDatePublished = { ...input };

    // delete the publication date (not all items will have this data)
    delete inputWithoutDatePublished.datePublished;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: inputWithoutDatePublished },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation
    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(
      inputWithoutDatePublished,
    );

    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(result.body.data?.createApprovedCorpusItem.createdBy).toEqual(
      headers.username,
    );

    // Check that the ADD_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.ADD_ITEM,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(result.body.data?.createApprovedCorpusItem.externalId);
  });

  it('should fail to create an approved item with a duplicate URL', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // Create an approved item with a set URL
    await createApprovedItemHelper(db, {
      title: 'I was here first!',
      url: 'https://test.com/docker',
    });

    // Attempt to create another item with the same URL
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `An approved item with the URL "${input.url}" already exists`,
    );

    // Check that the ADD_ITEM event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail to create an approved item if a rejected item with the same URL exists', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // Create an approved item with a set URL
    await createRejectedCuratedCorpusItemHelper(db, {
      title: 'I was here first!',
      url: 'https://test.com/docker',
    });

    // Attempt to create another item with the same URL
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.errors).not.toBeUndefined();

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `A rejected item with the URL "${input.url}" already exists`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // Check that the ADD_ITEM event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should create an optional scheduled item', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    // extra inputs - all three must be set to create a scheduled item
    input.scheduledDate = '2100-01-01';
    input.scheduledSurfaceGuid = 'NEW_TAB_EN_US';
    input.scheduledSource = ScheduledItemSource.ML;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation

    // We only return the approved item here, so need to purge the scheduling
    // input values from the input before comparison.
    delete input.scheduledDate;
    delete input.scheduledSurfaceGuid;
    delete input.scheduledSource;

    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(input);

    // The input domain was not previously scheduled, and is therefore not trusted yet.
    expect(
      result.body.data?.createApprovedCorpusItem.hasTrustedDomain,
    ).toStrictEqual(false);

    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(result.body.data?.createApprovedCorpusItem.createdBy).toEqual(
      headers.username,
    );

    // NB: we don't (yet) return anything for the scheduled item,
    // but if the mutation does not fall over, that means it has been created
    // successfully.

    // Check that both ADD_ITEM and ADD_SCHEDULE events were fired successfully:
    // 1 - Two events were fired!
    expect(eventTracker).toHaveBeenCalledTimes(2);

    // 2 - Events have the right types.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.ADD_ITEM,
    );
    const emitScheduledCorpusItemEventArgs = await eventTracker.mock
      .calls[1][0];
    expect(emitScheduledCorpusItemEventArgs.eventType).toEqual(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
    );
    expect(
      emitScheduledCorpusItemEventArgs.scheduledCorpusItem.generated_by,
    ).toEqual(ScheduledItemSource.ML);

    // 3- Events have the right entities passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(result.body.data?.createApprovedCorpusItem.externalId);

    // Since we don't return the scheduled item alongside the curated item
    // in the result of this mutation, there is no exact value to compare it to.
    // Let's just make sure it is there at all.
    expect(
      await eventTracker.mock.calls[1][0].scheduledCorpusItem.externalId,
    ).not.toBeNull();
  });

  it('should create a TrustedDomain if the domain has a past scheduled date', async () => {
    // extra inputs - all three must be set to create a scheduled item
    input.scheduledDate = '2100-01-01';
    input.scheduledSurfaceGuid = 'NEW_TAB_EN_US';
    input.scheduledSource = ScheduledItemSource.ML;

    const pastApprovedItem = await createApprovedItemHelper(db, {
      url: `${input.url}/old-article`,
      title: 'Old Article',
    });

    // create a scheduled entry in the past for this item
    await createScheduledItemHelper(db, {
      approvedItem: pastApprovedItem,
      scheduledDate: new Date(2024, 1, 1).toISOString(),
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(
      result.body.data?.createApprovedCorpusItem.hasTrustedDomain,
    ).toStrictEqual(true);

    // Check that example.com exists as a TrustedDomain in the database.
    const trustedDomain = await db.trustedDomain.findUnique({
      where: { domainName: 'test.com' },
    });
    expect(trustedDomain).toBeTruthy();
  });

  it('should not create a scheduled item if one of the scheduled properties was not suppplied', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);
    eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

    // extra inputs - but missing `scheduledSource`!
    input.scheduledDate = '2100-01-01';
    input.scheduledSurfaceGuid = 'NEW_TAB_EN_US';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation

    // We only return the approved item here, so need to purge the scheduling
    // input values from the input before comparison.
    delete input.scheduledDate;
    delete input.scheduledSurfaceGuid;

    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(input);

    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(result.body.data?.createApprovedCorpusItem.createdBy).toEqual(
      headers.username,
    );

    // NB: we don't (yet) return anything for the scheduled item,
    // but if the mutation does not fall over, that means it has been created
    // successfully.

    // Check that only the ADD_ITEM and *not* the ADD_SCHEDULE event was fired:
    // 1 - Only one event was fired!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.ADD_ITEM,
    );

    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(result.body.data?.createApprovedCorpusItem.externalId);
  });

  it('should not create a scheduled entry for an approved item with invalid Scheduled Surface GUID supplied', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // extra inputs
    input.scheduledDate = '2100-01-01';
    input.scheduledSurfaceGuid = 'RECSAPI';
    input.scheduledSource = ScheduledItemSource.ML;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();
    expect(result.body.errors).not.toBeUndefined();

    // And there is the right error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a scheduled entry with Scheduled Surface GUID of "${input.scheduledSurfaceGuid}".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // Check that the ADD_ITEM event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should accept optional analytics metadata', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // extra inputs for analytics data
    input.actionScreen = ActionScreen.SCHEDULE;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation

    // We only return the approved item here, so need to purge the analytics
    // input values from the input before comparison.
    delete input.actionScreen;

    expect(result.body.data?.createApprovedCorpusItem).toMatchObject(input);

    expect(eventTracker).toHaveBeenCalledTimes(1);

    // 2 - Events have the right values.
    const emitApprovedCorpusItemEventArgs = await eventTracker.mock.calls[0][0];

    expect(
      emitApprovedCorpusItemEventArgs.reviewedCorpusItem.action_screen,
    ).toEqual(ActionScreen.SCHEDULE);
  });

  it('should not create an approved item with invalid topic supplied', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.ADD_ITEM, eventTracker);

    // the correct value is `HEALTH_FITNESS`
    input.topic = 'HEALTH FITNESS';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();
    expect(result.body.errors).not.toBeUndefined();

    // And there is the right error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a corpus item with the topic "${input.topic}".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // Check that the ADD_ITEM event was not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail if language code is outside of allowed values', async () => {
    input.language = 'ZZ';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeUndefined();

    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    expect(result.body.errors?.[0].message).toContain(
      'does not exist in "CorpusLanguage" enum.',
    );
  });

  it('should fail if language code is correct but not in upper case', async () => {
    input.language = 'de';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeUndefined();

    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    expect(result.body.errors?.[0].message).toContain(
      'does not exist in "CorpusLanguage" enum.',
    );
  });
});
