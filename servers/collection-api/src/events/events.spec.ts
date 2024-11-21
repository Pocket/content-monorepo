import * as Sentry from '@sentry/node';
import { client } from '../database/client';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import config from '../config';

import * as events from './events';

import {
  testAuthor,
  testCollection,
  testCurationCategory,
  testIABCategory,
  testLabels,
  testPartnership,
  testStory,
} from './testData';
import {
  EventBridgeEventType,
  CollectionStatus,
  CollectionLanguage,
} from './types';
import { CollectionComplete } from '../database/types';
import { PrismaClient } from '.prisma/client';
import { serverLogger } from '@pocket-tools/ts-logger';

describe('event helpers: ', () => {
  const dbClient: PrismaClient = client();

  const eventBridgeSendMock = jest.spyOn(EventBridgeClient.prototype, 'send');

  eventBridgeSendMock.mockImplementation(() => {
    return { FailedEntryCount: 0 };
  });

  const sentryStub = jest.spyOn(Sentry, 'captureException').mockReturnThis();
  const crumbStub = jest.spyOn(Sentry, 'addBreadcrumb').mockReturnThis();
  const loggerSpy = jest.spyOn(serverLogger, 'error');

  let getCollectionLabelsForSnowplowStub;

  beforeEach(() => {
    jest.clearAllMocks();

    getCollectionLabelsForSnowplowStub = jest
      .spyOn(events, 'getCollectionLabelsForSnowplow')
      .mockResolvedValue(testLabels);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('generateEventBridgePayload function', () => {
    it('should transform db collection object to event payload', async () => {
      const payload = await events.generateEventBridgePayload(
        dbClient,
        EventBridgeEventType.COLLECTION_CREATED,
        { ...testCollection, status: 'ARCHIVED', publishedAt: undefined },
      );

      // assert that db call to fetch labels for collection via CollectionLabel ids is called
      expect(getCollectionLabelsForSnowplowStub).toHaveBeenCalledTimes(1);

      // assert all the collection object top level properties are correct
      expect(payload.collection.externalId).toEqual(testCollection.externalId);
      expect(payload.collection.title).toEqual(testCollection.title);
      expect(payload.collection.slug).toEqual(testCollection.slug);
      expect(payload.collection.excerpt).toEqual('');
      expect(payload.collection.imageUrl).toEqual('');
      expect(payload.collection.intro).toEqual('');

      expect(payload.collection.status).toEqual('archived');
      expect(payload.collection.language).toEqual(
        CollectionLanguage[testCollection.language],
      );
      expect(payload.collection.authors.length).toEqual(0);
      expect(payload.collection.stories.length).toEqual(0);
      expect(payload.collection.labels.length).toEqual(testLabels.length);

      // asserting on the empty object ({}) properties
      expect(payload.collection.curationCategory).toEqual({});
      expect(payload.collection.partnership).toEqual({});
      expect(payload.collection.IABParentCategory).toEqual({});
      expect(payload.collection.IABChildCategory).toEqual({});

      // assert Date time stamps are converted to unix seconds format
      expect(payload.collection.createdAt).toEqual(1672549200);
      expect(payload.collection.updatedAt).toEqual(1672549200);
      // missing publishedAt should be set to null
      expect(payload.collection.publishedAt).toEqual(null);

      // assert the remaining two props of the payload object are correct
      expect(payload.eventType).toEqual(
        EventBridgeEventType.COLLECTION_CREATED,
      );
      expect(payload.object_version).toEqual('new');
    });

    it('should transform db collection sub types to event payload collection sub types', async () => {
      const dbCollection: CollectionComplete = {
        ...testCollection,
        authors: [testAuthor],
        stories: [testStory],
        curationCategory: testCurationCategory,
        partnership: testPartnership,
        IABParentCategory: testIABCategory,
        IABChildCategory: testIABCategory,
      };

      const payload = await events.generateEventBridgePayload(
        dbClient,
        EventBridgeEventType.COLLECTION_UPDATED,
        dbCollection,
      );

      expect(payload.collection.status).toEqual(
        CollectionStatus[testCollection.status],
      );
      expect(payload.collection.publishedAt).toEqual(1672549200);

      // Testing the transform functions here by deep assertions.
      // These assertions could've been included in the above test but breaking it down into two tests.

      const author = dbCollection.authors[0];
      expect(payload.collection.authors[0]).toEqual({
        collection_author_id: author.externalId,
        image_url: author.imageUrl,
        name: author.name,
        active: author.active,
        slug: author.slug,
        bio: author.bio,
      });

      const story = dbCollection.stories[0];
      expect(payload.collection.stories[0]).toEqual({
        collection_story_id: story.externalId,
        image_url: story.imageUrl,
        is_from_partner: story.fromPartner,
        sort_order: story.sortOrder,
        authors: [
          {
            name: story.authors[0].name,
            sort_order: story.authors[0].sortOrder,
          },
        ],
        url: story.url,
        title: story.title,
        excerpt: story.excerpt,
        publisher: story.publisher,
      });

      expect(payload.collection.labels).toEqual([
        {
          collection_label_id: testLabels[0].externalId,
          name: testLabels[0].name,
        },
        {
          collection_label_id: testLabels[1].externalId,
          name: testLabels[1].name,
        },
      ]);

      expect(payload.collection.curationCategory).toEqual({
        collection_curation_category_id:
          dbCollection.curationCategory.externalId,
        name: dbCollection.curationCategory.name,
        slug: dbCollection.curationCategory.slug,
      });

      expect(payload.collection.partnership).toEqual({
        collection_partnership_id: dbCollection.partnership.externalId,
        name: dbCollection.partnership.name,
        blurb: dbCollection.partnership.blurb,
        image_url: dbCollection.partnership.imageUrl,
        type: dbCollection.partnership.type,
        url: dbCollection.partnership.url,
      });

      expect(payload.collection.IABParentCategory).toEqual({
        collection_iab_parent_category_id:
          dbCollection.IABParentCategory.externalId,
        name: dbCollection.IABParentCategory.name,
        slug: dbCollection.IABParentCategory.slug,
      });

      expect(payload.collection.IABChildCategory).toEqual({
        collection_iab_child_category_id:
          dbCollection.IABChildCategory.externalId,
        name: dbCollection.IABChildCategory.name,
        slug: dbCollection.IABChildCategory.slug,
      });
    });
  });

  describe('sendEvent function', () => {
    it('should send event to event bus with proper event data', async () => {
      const payload = await events.generateEventBridgePayload(
        dbClient,
        EventBridgeEventType.COLLECTION_CREATED,
        testCollection,
      );

      await events.sendEvent(payload);

      // Wait just a tad in case promise needs time to resolve
      setTimeout(() => {
        return;
      }, 100);

      expect(sentryStub).toHaveBeenCalledTimes(0);
      expect(loggerSpy).toHaveBeenCalledTimes(0);

      // Event was sent to Event Bus
      expect(eventBridgeSendMock).toHaveBeenCalledTimes(1);

      // Check that the payload is correct; since it's JSON, we need to decode the data
      // otherwise it also does ordering check
      const sendCommand = eventBridgeSendMock.mock.calls[0][0].input as any;

      expect(sendCommand).toHaveProperty('Entries');

      expect(sendCommand.Entries[0]).toMatchObject({
        Source: config.aws.eventBus.eventBridge.source,
        EventBusName: config.aws.eventBus.name,
        DetailType: EventBridgeEventType.COLLECTION_CREATED,
      });

      // Compare to initial payload
      expect(sendCommand.Entries[0]['Detail']).toEqual(JSON.stringify(payload));
    });

    it('should log error if any events fail to send for collection-created event', async () => {
      eventBridgeSendMock.mockClear();

      eventBridgeSendMock.mockImplementation(() => {
        return { FailedEntryCount: 1 };
      });

      const payload = await events.generateEventBridgePayload(
        dbClient,
        EventBridgeEventType.COLLECTION_CREATED,
        testCollection,
      );

      await events.sendEvent(payload);

      // Wait in case promise needs time to resolve
      setTimeout(() => {
        return;
      }, 100);

      expect(sentryStub).toHaveBeenCalledTimes(1);

      expect(sentryStub.mock.calls[0][0].message).toContain(
        `sendEvent: Failed to send event 'collection-created' to event bus`,
      );

      expect(loggerSpy).toHaveBeenCalledTimes(1);

      // get array of inputs to the first call to the logger
      const loggerFirstCallInputs = loggerSpy.mock.calls[0];

      // the first input to the logger should be...
      expect(loggerFirstCallInputs.at(0)).toEqual(
        `event failed - event bridge error`,
      );

      // the second input to the logger is an object - let's verify the eventType
      expect(loggerFirstCallInputs.at(1)).toMatchObject({
        eventType: 'collection-created',
      });
    });

    it('should log error if any events fail to send for collection-updated event', async () => {
      eventBridgeSendMock.mockClear();

      eventBridgeSendMock.mockImplementation(() => {
        return { FailedEntryCount: 1 };
      });

      const payload = await events.generateEventBridgePayload(
        dbClient,
        EventBridgeEventType.COLLECTION_UPDATED, // event type is collection-updated
        testCollection,
      );

      await events.sendEvent(payload);

      // Wait in case promise needs time to resolve
      setTimeout(() => {
        return;
      }, 100);

      expect(sentryStub).toHaveBeenCalledTimes(1);

      expect(sentryStub.mock.calls[0][0].message).toContain(
        `sendEvent: Failed to send event 'collection-updated' to event bus`,
      );

      expect(loggerSpy).toHaveBeenCalledTimes(1);

      // get array of inputs to the first call to the logger
      const loggerFirstCallInputs = loggerSpy.mock.calls[0];

      // the first input to the logger should be...
      expect(loggerFirstCallInputs.at(0)).toEqual(
        `event failed - event bridge error`,
      );

      // the second input to the logger is an object - let's verify the eventType
      expect(loggerFirstCallInputs.at(1)).toMatchObject({
        eventType: 'collection-updated',
      });
    });
  });

  describe('sendEventBridgeEvent function', () => {
    it('should log error if send call throws error', async () => {
      eventBridgeSendMock.mockClear();

      eventBridgeSendMock.mockImplementation(() => {
        throw new Error('boo!');
      });

      await events.sendEventBridgeEvent(
        dbClient,
        EventBridgeEventType.COLLECTION_CREATED,
        testCollection,
      );

      // Wait in case promise needs time to resolve
      setTimeout(() => {
        return;
      }, 100);

      expect(sentryStub).toHaveBeenCalledTimes(1);

      expect(sentryStub.mock.calls[0][0].message).toContain('boo!');

      expect(crumbStub).toHaveBeenCalledTimes(1);

      expect(crumbStub.mock.calls[0][0].message).toContain(
        `sendEventBridgeEvent: Failed to send event 'collection-created' to event bus`,
      );

      expect(loggerSpy).toHaveBeenCalledTimes(1);

      // get array of inputs to the first call to the logger
      const loggerFirstCallInputs = loggerSpy.mock.calls[0];

      expect(loggerFirstCallInputs.at(0)).toEqual(
        `event failed - failed sending to event bridge`,
      );

      expect(loggerFirstCallInputs.at(1)['error'].message).toEqual('boo!');
    });
  });
});
