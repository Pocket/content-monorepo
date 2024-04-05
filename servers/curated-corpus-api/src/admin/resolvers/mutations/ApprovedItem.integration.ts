import FormData from 'form-data';
import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActionScreen,
  ApprovedItemAuthor,
  CreateApprovedCorpusItemApiInput,
  CorpusItemSource,
  CuratedStatus,
  ScheduledItemSource,
  CorpusLanguage,
  Topics,
} from 'content-common';

import { client } from '../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createRejectedCuratedCorpusItemHelper,
  createScheduledItemHelper,
} from '../../../test/helpers';
import {
  CREATE_APPROVED_ITEM,
  REJECT_APPROVED_ITEM,
  UPDATE_APPROVED_ITEM,
  UPDATE_APPROVED_ITEM_AUTHORS,
} from './sample-mutations.gql';
import {
  ApprovedItem,
  UpdateApprovedItemAuthorsInput,
} from '../../../database/types';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../events/init';
import {
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
} from '../../../events/types';
import Upload from 'graphql-upload/Upload.js';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { GET_REJECTED_ITEMS } from '../queries/sample-queries.gql';
import { MozillaAccessGroup } from '../../../shared/types';
import {
  RejectApprovedCorpusItemApiInput,
  UpdateApprovedCorpusItemApiInput,
} from '../types';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';
import { integrationTestsS3UrlPattern } from '../../aws/upload.integration';

describe('mutations: ApprovedItem', () => {
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

  describe('createApprovedCorpusItem mutation', () => {
    // a standard set of inputs for this mutation
    let input: CreateApprovedCorpusItemApiInput;

    beforeEach(() => {
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

      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );

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
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );

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
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );

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
      const emitApprovedCorpusItemEventArgs = await eventTracker.mock
        .calls[0][0];

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
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );

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

      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );
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

      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );
      expect(result.body.errors?.[0].message).toContain(
        'does not exist in "CorpusLanguage" enum.',
      );
    });
  });

  describe('updateApprovedCorpusItem mutation', () => {
    let item: ApprovedItem;
    let authors: ApprovedItemAuthor[];
    let input: UpdateApprovedCorpusItemApiInput;

    beforeEach(async () => {
      item = await createApprovedItemHelper(db, {
        title: "3 Things Everyone Knows About LEGO That You Don't",
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      // authors from `item` above do not go through graphql and therefore
      // contain extra info (externalId, approvedItemId). we need to remove
      // those properties to prepare an authors array for the update `input`
      // below
      if (item.authors) {
        authors =
          item.authors?.map((author) => ({
            name: author.name,
            sortOrder: author.sortOrder,
          })) ?? [];
      }

      input = {
        externalId: item.externalId,
        title: 'Anything but LEGO',
        excerpt: 'Updated excerpt',
        authors,
        status: CuratedStatus.CORPUS,
        imageUrl: 'https://test.com/image.png',
        language: CorpusLanguage.DE,
        publisher: 'Cloud Factory',
        datePublished: '2024-02-24',
        topic: Topics.BUSINESS,
        isTimeSensitive: true,
      };
    });

    it('should succeed on the happy path (full access, valid input)', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

      const res = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      // Good to check for any errors before proceeding with the rest of the test
      expect(res.body.errors).toBeUndefined();
      const data = res.body.data;

      // External ID should be unchanged
      expect(data?.updateApprovedCorpusItem.externalId).toEqual(
        item.externalId,
      );

      // Updated properties should be... updated
      expect(data?.updateApprovedCorpusItem).toMatchObject(input);

      // The `updatedBy` field should now be the SSO username of the user
      // who updated this record
      expect(data?.updateApprovedCorpusItem.updatedBy).toEqual(
        headers.username,
      );

      // Check that the UPDATE_ITEM event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker).toHaveBeenCalledTimes(1);
      // 2 - Event has the right type.
      expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
        ReviewedCorpusItemEventType.UPDATE_ITEM,
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
      ).toEqual(data?.updateApprovedCorpusItem.externalId);
    });

    it('should succeed if publication date is not provided', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

      // clone the input
      const inputWithoutDatePublished = { ...input };

      // delete the publication date (not all items will have this data)
      delete inputWithoutDatePublished.datePublished;

      const res = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: inputWithoutDatePublished },
        });

      // Good to check for any errors before proceeding with the rest of the test
      expect(res.body.errors).toBeUndefined();
      const data = res.body.data;

      // External ID should be unchanged
      expect(data?.updateApprovedCorpusItem.externalId).toEqual(
        item.externalId,
      );

      // Updated properties should be... updated
      expect(data?.updateApprovedCorpusItem).toMatchObject(
        inputWithoutDatePublished,
      );

      // Publication date was not provided by the test helper and should
      // remain empty after this update
      expect(data?.updateApprovedCorpusItem.datePublished).toBeNull();

      // The `updatedBy` field should now be the SSO username of the user
      // who updated this record
      expect(data?.updateApprovedCorpusItem.updatedBy).toEqual(
        headers.username,
      );

      // Check that the UPDATE_ITEM event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker).toHaveBeenCalledTimes(1);
      // 2 - Event has the right type.
      expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
        ReviewedCorpusItemEventType.UPDATE_ITEM,
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
      ).toEqual(data?.updateApprovedCorpusItem.externalId);
    });

    it('should accept optional analytics metadata', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

      // extra inputs for analytics data
      input.actionScreen = ActionScreen.SCHEDULE;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // Expect to see all the input data we supplied in the Approved Item
      // returned by the mutation

      // We only return the approved item here, so need to purge the analytics
      // input values from the input before comparison.
      delete input.actionScreen;

      expect(result.body.data?.updateApprovedCorpusItem).toMatchObject(input);

      expect(eventTracker).toHaveBeenCalledTimes(1);

      // 2 - Events have the right values.
      const emitUpdatedCorpusItemEventArgs = await eventTracker.mock
        .calls[0][0];

      expect(
        emitUpdatedCorpusItemEventArgs.reviewedCorpusItem.action_screen,
      ).toEqual(ActionScreen.SCHEDULE);
    });

    it('should fail if sent an invalid topic', async () => {
      // this should be `HEALTH_FITNESS`
      input.topic = 'HEALTH FITNESS';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // And there is the right error from the resolvers
      expect(result.body.errors?.[0].message).toContain(
        `Cannot create a corpus item with the topic "${input.topic}".`,
      );
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );
    });

    it('should fail if language code is outside of allowed values', async () => {
      // remove type safety to force a bad value
      const badInput: any = { ...input };
      badInput.language = 'ZZ';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: badInput },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeUndefined();

      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );
      expect(result.body.errors?.[0].message).toContain(
        'does not exist in "CorpusLanguage" enum.',
      );
    });

    it('should fail if language code is correct but not in upper case', async () => {
      const badInput: any = { ...input };
      badInput.language = 'de';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: badInput },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeUndefined();

      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );
      expect(result.body.errors?.[0].message).toContain(
        'does not exist in "CorpusLanguage" enum.',
      );
    });

    it('should succeed if language code (English) is correct and upper case', async () => {
      input.language = CorpusLanguage.EN;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).toBeUndefined();
      const data = result.body.data;
      expect(data.updateApprovedCorpusItem.language).toEqual('EN');
    });

    it('should succeed if language code (Deutsch) is correct and upper case', async () => {
      input.language = CorpusLanguage.DE;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).toBeUndefined();
      const data = result.body.data;
      expect(data.updateApprovedCorpusItem.language).toEqual('DE');
    });

    it('should succeed if language code (Italian) is correct and upper case', async () => {
      input.language = CorpusLanguage.IT;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).toBeUndefined();
      const data = result.body.data;
      expect(data.updateApprovedCorpusItem.language).toEqual('IT');
    });

    it('should succeed if language code (Spanish) is correct and upper case', async () => {
      input.language = CorpusLanguage.ES;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).toBeUndefined();
      const data = result.body.data;
      expect(data.updateApprovedCorpusItem.language).toEqual('ES');
    });

    it('should succeed if language code (French) is correct and upper case', async () => {
      input.language = CorpusLanguage.FR;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).toBeUndefined();
      const data = result.body.data;
      expect(data.updateApprovedCorpusItem.language).toEqual('FR');
    });
  });

  describe('updateApprovedCorpusAuthorsItem mutation', () => {
    let item: ApprovedItem;
    let authors: ApprovedItemAuthor[];
    let input: UpdateApprovedItemAuthorsInput;

    beforeEach(async () => {
      item = await createApprovedItemHelper(db, {
        title: "3 Things Everyone Knows About LEGO That You Don't",
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      authors = [
        { name: 'Author One', sortOrder: 1 },
        { name: 'Author Two', sortOrder: 2 },
      ];

      input = {
        externalId: item.externalId,
        authors,
      };
    });

    it('should succeed if user has full access', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

      const res = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM_AUTHORS),
          variables: { data: input },
        });

      // Good to check for any errors before proceeding with the rest of the test
      expect(res.body.errors).toBeUndefined();
      const data = res.body.data;

      // External ID should be unchanged
      expect(data?.updateApprovedCorpusItemAuthors.externalId).toEqual(
        item.externalId,
      );

      // Updated properties should be... updated
      expect(data?.updateApprovedCorpusItemAuthors.authors).toEqual(
        input.authors,
      );

      // The `updatedBy` field should now be the SSO username of the user
      // who updated this record
      expect(data?.updateApprovedCorpusItemAuthors.updatedBy).toEqual(
        headers.username,
      );

      // Check that the UPDATE_ITEM event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker).toHaveBeenCalledTimes(1);
      // 2 - Event has the right type.
      expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
        ReviewedCorpusItemEventType.UPDATE_ITEM,
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
      ).toEqual(data?.updateApprovedCorpusItemAuthors.externalId);
    });
  });

  describe('rejectApprovedCorpusItem mutation', () => {
    it('moves a corpus item from the approved corpus to the rejection pile', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: 'MISINFORMATION,OTHER',
        actionScreen: ActionScreen.SCHEDULE,
      };

      const resultReject = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(resultReject.body.errors).toBeUndefined();
      expect(resultReject.body.data).not.toBeNull();

      // On success, mutation should return the deleted approved item.
      // Let's verify the id.
      expect(
        resultReject.body.data?.rejectApprovedCorpusItem.externalId,
      ).toEqual(item.externalId);

      // The `updatedBy` field should now be the SSO username of the user
      // who updated this record
      expect(
        resultReject.body.data?.rejectApprovedCorpusItem.updatedBy,
      ).toEqual(headers.username);

      // There should be a rejected item created. Since we always truncate
      // the database before every test, it is safe to assume that the
      // `getRejectedCorpusItems` query will contain the one item
      // that was created by this mutation.
      const resultGetReject = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_REJECTED_ITEMS) });
      // There should be one rejected item in there...
      expect(
        resultGetReject.body.data?.getRejectedCorpusItems.totalCount,
      ).toEqual(1);
      // ...and its URL should match that of the deleted Approved Item.
      expect(
        resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node.url,
      ).toEqual(item.url);
      // The `createdBy` field should now be the SSO username of the user
      // who updated this record
      expect(
        resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node
          .createdBy,
      ).toEqual(headers.username);

      // Check that the REMOVE_ITEM and REJECT_ITEM events were fired successfully.
      expect(eventTracker).toHaveBeenCalledTimes(2);

      // The REMOVE_ITEM event sends up-to-date info on the Approved Item.
      const removeItemEvent = await eventTracker.mock.calls[0][0];

      expect(removeItemEvent.eventType).toEqual(
        ReviewedCorpusItemEventType.REMOVE_ITEM,
      );
      expect(removeItemEvent.reviewedCorpusItem.externalId).toEqual(
        resultReject.body.data?.rejectApprovedCorpusItem.externalId,
      );
      expect(removeItemEvent.reviewedCorpusItem.action_screen).toEqual(
        input.actionScreen,
      );
      expect(removeItemEvent.reviewedCorpusItem.url).toEqual(
        resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node.url,
      );

      // The REJECT_ITEM event sends through the newly created Rejected Item.
      const rejectItemEvent = await eventTracker.mock.calls[1][0];

      expect(rejectItemEvent.eventType).toEqual(
        ReviewedCorpusItemEventType.REJECT_ITEM,
      );
      expect(rejectItemEvent.reviewedCorpusItem.action_screen).toEqual(
        input.actionScreen,
      );
    });

    it('should fail if externalId of approved item is not valid', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: 'this-id-does-not-exist',
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();

      expect(result.body.errors?.[0].message).toEqual(
        `Could not find an approved item with external id of "${input.externalId}".`,
      );
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'BAD_USER_INPUT',
      );

      // Check that the events were not fired
      expect(eventTracker).toHaveBeenCalledTimes(0);
    });

    it('should fail if approved item has Scheduled Surface scheduled entries', async () => {
      // Set up event tracking
      const eventTracker = jest.fn();
      eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      const item = await createApprovedItemHelper(db, {
        title: 'More Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.CORPUS,
        language: 'EN',
      });

      // Add an entry to a Scheduled Surface - approved item now can't be deleted
      // for data integrity reasons.
      await createScheduledItemHelper(db, {
        approvedItem: item,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();

      expect(result.body.errors?.[0].message).toEqual(
        `Cannot remove item from approved corpus - scheduled entries exist.`,
      );
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'INTERNAL_SERVER_ERROR',
      );

      // Check that the events were not fired
      expect(eventTracker).toHaveBeenCalledTimes(0);
    });

    it('should succeed with spaces in rejection reasons', async () => {
      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: ' MISINFORMATION, OTHER ',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();
    });

    it('should fail when given an invalid rejection reason', async () => {
      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: 'BADFONT',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(
        ` is not a valid rejection reason.`,
      );
    });

    it('should fail when given invalid rejection reasons', async () => {
      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: 'BADFONT,BORINGCOLORS',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(
        ` is not a valid rejection reason.`,
      );
    });

    it('should fail when given valid and invalid rejection reasons', async () => {
      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedCorpusItemApiInput = {
        externalId: item.externalId,
        reason: 'MISINFORMATION,IDONTLIKEIT',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(
        ` is not a valid rejection reason.`,
      );
    });
  });

  describe('uploadApprovedCorpusItemImage mutation', () => {
    const testFilePath = __dirname + '/test-image.jpeg';

    beforeEach(() => {
      writeFileSync(testFilePath, 'I am an image');
    });

    afterEach(() => {
      unlinkSync(testFilePath);
    });

    it.skip('it should execute the mutation without errors and return the s3 location url', async () => {
      /**
       * context about this skip:
       *
       * graphql multi-part form support via `graphql-upload` is being deprecated in apollo router.
       * So this is going to be deprecated soon in favor of uploading to presigned urls, and just
       * using graphql to negotiate that url.
       *
       * We also just had an incident associated with file uploads due to headers not being passed
       * through to collection-api via admin-api, and collection-api started rejecting these requests
       * during the apollo v4 migration, causing file uploads to fail in the curation tools.
       *
       * apollo v4 migration requires us to move most of our integration tests to express tests,
       * however, this particular test cannot be migrated without actually setting up an entire
       * `apollo-upload-client` stack, or digging into the implementation of `apollo-upload` and
       * reverse engineering enough to replicate the request. This implementation is a swing at that,
       * influenced by https://github.com/jaydenseric/graphql-upload/blob/master/graphqlUploadExpress.test.mjs,
       * however it does not work.
       *
       * This test doesn't prevent regression of the incident in curation tools (dependent on interplay
       * with admin-api gateway), and there are also file upload unit tests testing upload interfaces.
       *
       * Due to the amount of work required to migrate, pressure to deprecate this style of upload (apollo
       * router migration), and inability to automatically test with the gateway, this test is being skipped
       * and will rely on manual testing.
       *
       * Leaving the rough test stub here in place because we do want test coverage here once we move to
       * pre-signed urls, and in case we have to revisit this before we can deprecate.
       *
       * If we have a regression around image uploads and CSRF, ensure that the `apollo-require-preflight`
       * header is reaching this service as a first investigation.
       */
      const image: Upload = new Upload();

      image.resolve({
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        encoding: '7bit',
        createReadStream: () => createReadStream(testFilePath),
      });

      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', createReadStream(testFilePath));

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send(body);

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).toHaveProperty('uploadApprovedCorpusItemImage');
      expect(result.body.data?.uploadApprovedCorpusItemImage.url).toMatch(
        integrationTestsS3UrlPattern,
      );
    });
  });
});
