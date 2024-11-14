import { expect } from 'chai';
import sinon from 'sinon';
import * as Sentry from '@sentry/node';
import { client } from '../database/client';
import {
  CollectionLanguage,
  CollectionStatus,
  PocketEventBridgeClient,
  PocketEventType,
} from '@pocket-tools/event-bridge';

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
import { CollectionComplete } from '../database/types';
import { PrismaClient } from '.prisma/client';
import { serverLogger } from '@pocket-tools/ts-logger';

describe('event helpers: ', () => {
  const dbClient: PrismaClient = client();

  // setting up stubs and spies
  const sandbox = sinon.createSandbox();

  const clientStub = sandbox
    .stub(PocketEventBridgeClient.prototype, 'sendPocketEvent')
    .resolves();

  const sentryStub = sandbox.stub(Sentry, 'captureException').resolves();
  const crumbStub = sandbox.stub(Sentry, 'addBreadcrumb').resolves();
  const loggerSpy = sandbox.spy(serverLogger, 'error');

  let getCollectionLabelsForSnowplowStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();
    getCollectionLabelsForSnowplowStub = sinon
      .stub(events, 'getCollectionLabelsForSnowplow')
      .resolves(testLabels);
  });

  afterEach(() => {
    sandbox.resetHistory();
    getCollectionLabelsForSnowplowStub.reset();
  });
  afterAll(() => {
    sandbox.restore();
  });

  describe('generateEventBridgePayload function', () => {
    it('should transform db collection object to event payload', async () => {
      const payload = await events.generateEventBridgePayload(
        dbClient,
        PocketEventType.COLLECTION_CREATED,
        { ...testCollection, status: 'ARCHIVED', publishedAt: undefined },
      );

      // assert that db call to fetch labels for collection via CollectionLabel ids is called
      expect(getCollectionLabelsForSnowplowStub.calledOnce).to.be.true;

      // assert all the collection object top level properties are correct
      expect(payload.detail.collection.externalId).to.equal(
        testCollection.externalId,
      );
      expect(payload.detail.collection.title).to.equal(testCollection.title);
      expect(payload.detail.collection.slug).to.equal(testCollection.slug);
      expect(payload.detail.collection.excerpt).to.be.null;
      expect(payload.detail.collection.imageUrl).to.be.null;
      expect(payload.detail.collection.intro).to.be.null;

      expect(payload.detail.collection.status).to.equal('archived');
      expect(payload.detail.collection.language).to.equal(
        CollectionLanguage[testCollection.language],
      );
      expect(payload.detail.collection.authors.length).to.equal(0);
      expect(payload.detail.collection.stories.length).to.equal(0);
      expect(payload.detail.collection.labels.length).to.equal(
        testLabels.length,
      );

      // asserting on the null object () properties
      expect(payload.detail.collection.curationCategory).to.be.null;
      expect(payload.detail.collection.partnership).to.be.null;
      expect(payload.detail.collection.IABParentCategory).to.be.null;
      expect(payload.detail.collection.IABChildCategory).to.be.null;

      // assert Date time stamps are converted to unix seconds format
      expect(payload.detail.collection.createdAt).to.equal(1672549200);
      expect(payload.detail.collection.updatedAt).to.equal(1672549200);
      // missing publishedAt should be set to null
      expect(payload.detail.collection.publishedAt).to.equal(null);
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
        PocketEventType.COLLECTION_UPDATED,
        dbCollection,
      );

      expect(payload.detail.collection.status).to.equal(
        CollectionStatus[testCollection.status],
      );
      expect(payload.detail.collection.publishedAt).to.equal(1672549200);

      // Testing the transform functions here by deep assertions.
      // These assertions could've been included in the above test but breaking it down into two tests.

      const author = dbCollection.authors[0];
      expect(payload.detail.collection.authors[0]).to.deep.equal({
        collection_author_id: author.externalId,
        image_url: author.imageUrl,
        name: author.name,
        active: author.active,
        slug: author.slug,
        bio: author.bio,
      });

      const story = dbCollection.stories[0];
      expect(payload.detail.collection.stories[0]).to.deep.equal({
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

      expect(payload.detail.collection.labels).to.deep.equal([
        {
          collection_label_id: testLabels[0].externalId,
          name: testLabels[0].name,
        },
        {
          collection_label_id: testLabels[1].externalId,
          name: testLabels[1].name,
        },
      ]);

      expect(payload.detail.collection.curationCategory).to.deep.equal({
        collection_curation_category_id:
          dbCollection.curationCategory.externalId,
        name: dbCollection.curationCategory.name,
        slug: dbCollection.curationCategory.slug,
      });

      expect(payload.detail.collection.partnership).to.deep.equal({
        collection_partnership_id: dbCollection.partnership.externalId,
        name: dbCollection.partnership.name,
        blurb: dbCollection.partnership.blurb,
        image_url: dbCollection.partnership.imageUrl,
        type: dbCollection.partnership.type,
        url: dbCollection.partnership.url,
      });

      expect(payload.detail.collection.IABParentCategory).to.deep.equal({
        collection_iab_parent_category_id:
          dbCollection.IABParentCategory.externalId,
        name: dbCollection.IABParentCategory.name,
        slug: dbCollection.IABParentCategory.slug,
      });

      expect(payload.detail.collection.IABChildCategory).to.deep.equal({
        collection_iab_child_category_id:
          dbCollection.IABChildCategory.externalId,
        name: dbCollection.IABChildCategory.name,
        slug: dbCollection.IABChildCategory.slug,
      });
    });
  });

  describe('sendEventBridgeEvent function', () => {
    it('should log error if send call throws error', async () => {
      clientStub.restore();
      sandbox
        .stub(PocketEventBridgeClient.prototype, 'sendPocketEvent')
        .rejects(new Error('boo!'));

      await events.sendEventBridgeEvent(
        dbClient,
        PocketEventType.COLLECTION_CREATED,
        testCollection,
      );

      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain('boo!');
      expect(crumbStub.callCount).to.equal(1);
      expect(crumbStub.getCall(0).firstArg.message).to.contain(
        `sendEventBridgeEvent: Failed to send event 'collection-created' to event bus`,
      );
      expect(loggerSpy.callCount).to.equal(1);
      expect(loggerSpy.firstCall.firstArg).to.equal(
        `event failed - failed sending to event bridge`,
      );
      expect(loggerSpy.firstCall.lastArg.error.message).to.equal('boo!');
    });
  });
});
