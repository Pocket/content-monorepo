import { CuratedStatus } from '.prisma/client';
import {
  getAllSnowplowEvents,
  getGoodSnowplowEvents,
  parseSnowplowData,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common';
import { assertValidSnowplowObjectUpdateEvents } from '../../test/helpers/snowplow';
import config from '../../config';
import {
  ApprovedCorpusItemPayload,
  RejectedCorpusItemPayload,
  ReviewedCorpusItemEventType,
  ReviewedCorpusItemPayload,
} from '../types';
import { CorpusReviewStatus, ObjectVersion } from './schema';
import { ReviewedItemSnowplowHandler } from './ReviewedItemSnowplowHandler';
import { tracker } from './tracker';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { getUnixTimestamp } from '../../shared/utils';
import {
  ActionScreen,
  ApprovedItemAuthor,
  CorpusItemSource,
  Topics,
} from 'content-common';

/**
 * Use a simple mock item instead of using DB helpers
 * so that these tests can be run in the IDE
 */
const approvedItem: ApprovedCorpusItemPayload = {
  id: 123,
  externalId: '123-abc',
  prospectId: '456-dfg',
  url: 'https://test.com/a-story',
  domainName: 'test.com',
  status: CuratedStatus.RECOMMENDATION,
  title: 'Everything you need to know about React',
  excerpt: 'Something here',
  authors: [
    { name: 'Jane Austen', sortOrder: 1 },
    { name: 'Mary Shelley', sortOrder: 2 },
  ],
  publisher: 'Octopus Publishing House',
  datePublished: null,
  imageUrl: 'https://test.com/image.png',
  language: 'EN',
  topic: Topics.EDUCATION,
  source: CorpusItemSource.PROSPECT,
  isCollection: false,
  isSyndicated: false,
  isTimeSensitive: false,
  createdAt: new Date(),
  createdBy: 'Amy',
  updatedAt: new Date(),
  updatedBy: 'Amy',
};

const rejectedItem: RejectedCorpusItemPayload = {
  id: 123,
  externalId: '123-abc',
  prospectId: '456-dfg',
  url: 'https://test.com/a-story',
  title: 'Everything you need to know about React',
  publisher: 'Octopus Publishing House',
  language: 'EN',
  topic: Topics.EDUCATION,
  reason: 'COMMERCIAL,PAYWALL,OTHER',
  createdAt: new Date(),
  createdBy: 'Amy',
};

const approvedEventData: ReviewedCorpusItemPayload = {
  reviewedCorpusItem: approvedItem,
};

const rejectedEventData: ReviewedCorpusItemPayload = {
  reviewedCorpusItem: rejectedItem,
};

function assertValidSnowplowReviewedItemEvents(data) {
  const eventContext = parseSnowplowData(data);

  if (eventContext.data[0].data.corpus_review_status === 'rejected') {
    assertValidSnowplowRejectedItemEvents(eventContext);
  } else {
    assertValidSnowplowApprovedItemEvents(eventContext);
  }
}

const approvedItemEventContextData = {
  object_version: ObjectVersion.NEW,
  approved_corpus_item_external_id: approvedItem.externalId,
  prospect_id: approvedItem.prospectId,
  corpus_review_status: CorpusReviewStatus.RECOMMENDATION,
  url: approvedItem.url,
  title: approvedItem.title,
  excerpt: approvedItem.excerpt,
  publisher: approvedItem.publisher,
  authors:
    approvedItem.authors?.map((author: ApprovedItemAuthor) => author.name) ??
    [],
  image_url: approvedItem.imageUrl,
  language: approvedItem.language,
  topic: approvedItem.topic,
  is_collection: approvedItem.isCollection,
  is_time_sensitive: approvedItem.isTimeSensitive,
  is_syndicated: approvedItem.isSyndicated,
  created_at: getUnixTimestamp(approvedItem.createdAt),
  created_by: approvedItem.createdBy,
  updated_at: getUnixTimestamp(approvedItem.updatedAt),
  updated_by: approvedItem.updatedBy,
  loaded_from: CorpusItemSource.PROSPECT,
};

function assertValidSnowplowApprovedItemEvents(eventContext) {
  expect(eventContext.data).toMatchObject([
    {
      schema: config.snowplow.schemas.reviewedCorpusItem,
      data: approvedItemEventContextData,
    },
  ]);
}

function assertValidSnowplowRejectedItemEvents(eventContext) {
  const matchData: any = {
    object_version: ObjectVersion.NEW,
    rejected_corpus_item_external_id: rejectedItem.externalId,
    corpus_review_status: CorpusReviewStatus.REJECTED,
    url: rejectedItem.url,
    title: rejectedItem.title,
    language: rejectedItem.language,
    topic: rejectedItem.topic,
    rejection_reasons: ['COMMERCIAL', 'PAYWALL', 'OTHER'],
    created_at: getUnixTimestamp(rejectedItem.createdAt),
    created_by: rejectedItem.createdBy,
  };

  // if a rejected item has a prospect id, it will not have an approved item external id
  if (eventContext.data[0].data.prospect_id) {
    matchData.prospect_id = rejectedItem.prospectId;
  } else {
    matchData.approved_corpus_item_external_id = approvedItem.externalId;
  }

  expect(eventContext.data).toMatchObject([
    {
      schema: config.snowplow.schemas.reviewedCorpusItem,
      data: matchData,
    },
  ]);
}

describe('ReviewedItemSnowplowHandler', () => {
  const emitter = new CuratedCorpusEventEmitter();

  new ReviewedItemSnowplowHandler(emitter, tracker, [
    ReviewedCorpusItemEventType.ADD_ITEM,
    ReviewedCorpusItemEventType.UPDATE_ITEM,
    ReviewedCorpusItemEventType.REMOVE_ITEM,
    ReviewedCorpusItemEventType.REJECT_ITEM,
  ]);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send good events to Snowplow', async () => {
    // Emit all the events that are relevant for approved curated items
    emitter.emit(ReviewedCorpusItemEventType.ADD_ITEM, {
      ...approvedEventData,
      eventType: ReviewedCorpusItemEventType.ADD_ITEM,
    });
    emitter.emit(ReviewedCorpusItemEventType.UPDATE_ITEM, {
      ...approvedEventData,
      eventType: ReviewedCorpusItemEventType.UPDATE_ITEM,
    });
    emitter.emit(ReviewedCorpusItemEventType.REMOVE_ITEM, {
      ...approvedEventData,
      eventType: ReviewedCorpusItemEventType.REMOVE_ITEM,
    });
    // Emit the rejected item event
    emitter.emit(ReviewedCorpusItemEventType.REJECT_ITEM, {
      ...rejectedEventData,
      eventType: ReviewedCorpusItemEventType.REJECT_ITEM,
    });
    // Emit the rejected item event with an approved item external id
    // and no prospect id (mirrors case of rejecting an approved item)
    emitter.emit(ReviewedCorpusItemEventType.REJECT_ITEM, {
      reviewedCorpusItem: {
        ...rejectedItem,
        prospectId: null,
        approvedCorpusItemExternalId: approvedItem.externalId,
      },
      eventType: ReviewedCorpusItemEventType.REJECT_ITEM,
    });

    // make sure we only have good events
    const allEvents = await waitForSnowplowEvents(5);
    expect(allEvents.total).toEqual(5);
    expect(allEvents.good).toEqual(5);
    expect(allEvents.bad).toEqual(0);

    const goodEvents = await getGoodSnowplowEvents();

    goodEvents.forEach((event) => {
      assertValidSnowplowReviewedItemEvents(event.rawEvent.parameters.cx);
    });

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [
        'reviewed_corpus_item_added',
        'reviewed_corpus_item_updated',
        'reviewed_corpus_item_removed',
        'reviewed_corpus_item_rejected',
        'reviewed_corpus_item_rejected',
      ],
      'reviewed_corpus_item',
    );
  });

  describe('ML sourced approved items', () => {
    it('should send an approved item with `ML` as the `loaded_from` value', async () => {
      const approvedItemWithManualAdditionData: ApprovedCorpusItemPayload = {
        ...approvedItem,
        source: CorpusItemSource.ML,
      };

      emitter.emit(ReviewedCorpusItemEventType.ADD_ITEM, {
        reviewedCorpusItem: approvedItemWithManualAdditionData,
        eventType: ReviewedCorpusItemEventType.ADD_ITEM,
      });

      // make sure we only have good events
      const allEvents = await waitForSnowplowEvents();
      expect(allEvents.total).toEqual(1);
      expect(allEvents.good).toEqual(1);
      expect(allEvents.bad).toEqual(0);

      const goodEvents = await getGoodSnowplowEvents();

      const eventContext = parseSnowplowData(
        goodEvents[0].rawEvent.parameters.cx,
      );

      expect(eventContext.data).toMatchObject([
        {
          schema: config.snowplow.schemas.reviewedCorpusItem,
          data: {
            ...approvedItemEventContextData,
            loaded_from: CorpusItemSource.ML,
          },
        },
      ]);
    });
  });

  describe('action screen values', () => {
    it('should send an action screen value successfully when adding an item', async () => {
      const approvedItemWithActionScreenData: ApprovedCorpusItemPayload = {
        ...approvedItem,
        action_screen: ActionScreen.SCHEDULE,
      };

      emitter.emit(ReviewedCorpusItemEventType.ADD_ITEM, {
        reviewedCorpusItem: approvedItemWithActionScreenData,
        eventType: ReviewedCorpusItemEventType.ADD_ITEM,
      });

      // wait a sec * 3
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // make sure we only have good events
      const allEvents = await getAllSnowplowEvents();
      expect(allEvents.total).toEqual(1);
      expect(allEvents.good).toEqual(1);
      expect(allEvents.bad).toEqual(0);

      const goodEvents = await getGoodSnowplowEvents();

      const eventContext = parseSnowplowData(
        goodEvents[0].rawEvent.parameters.cx,
      );

      expect(eventContext.data).toMatchObject([
        {
          schema: config.snowplow.schemas.reviewedCorpusItem,
          data: {
            ...approvedItemEventContextData,
            action_screen: ActionScreen.SCHEDULE,
          },
        },
      ]);
    });

    it('should send an action screen value successfully when rejecting an item', async () => {
      const approvedItemWithActionScreenData: ApprovedCorpusItemPayload = {
        ...approvedItem,
        action_screen: ActionScreen.SCHEDULE,
      };

      emitter.emit(ReviewedCorpusItemEventType.REJECT_ITEM, {
        reviewedCorpusItem: approvedItemWithActionScreenData,
        eventType: ReviewedCorpusItemEventType.REJECT_ITEM,
      });

      // wait a sec * 3
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // make sure we only have good events
      const allEvents = await getAllSnowplowEvents();
      expect(allEvents.total).toEqual(1);
      expect(allEvents.good).toEqual(1);
      expect(allEvents.bad).toEqual(0);

      const goodEvents = await getGoodSnowplowEvents();

      const eventContext = parseSnowplowData(
        goodEvents[0].rawEvent.parameters.cx,
      );

      expect(eventContext.data).toMatchObject([
        {
          schema: config.snowplow.schemas.reviewedCorpusItem,
          data: {
            ...approvedItemEventContextData,
            action_screen: ActionScreen.SCHEDULE,
          },
        },
      ]);
    });

    it('should not send an unknown action screen value successfully', async () => {
      const approvedItemWithActionScreenData: any = {
        ...approvedItem,
        action_screen: 'CHAT',
      };

      emitter.emit(ReviewedCorpusItemEventType.ADD_ITEM, {
        reviewedCorpusItem: approvedItemWithActionScreenData,
        eventType: ReviewedCorpusItemEventType.ADD_ITEM,
      });

      // wait a sec * 3
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // make sure we only have good events
      const allEvents = await getAllSnowplowEvents();
      expect(allEvents.total).toEqual(1);
      expect(allEvents.good).toEqual(0);
      expect(allEvents.bad).toEqual(1);
    });
  });
});
