import { CuratedStatus } from '.prisma/client';
import {
  getBadSnowplowEvents,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common';
import {
  ApprovedCorpusItemPayload,
  RejectedCorpusItemPayload,
  ReviewedCorpusItemEventType,
  ReviewedCorpusItemPayload,
} from '../types';
import { ReviewedItemSnowplowHandler } from './ReviewedItemSnowplowHandler';
import { tracker } from './tracker';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { CorpusItemSource, Topics } from 'content-common';

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

describe('CustomJavascriptEnrichment', () => {
  const emitter = new CuratedCorpusEventEmitter();

  // force the tracker's app_id to be invalid
  tracker.setAppId('unsupported-app-id');

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should reject otherwise good events to Snowplow based on an unsupported app_id in the tracker', async () => {
    new ReviewedItemSnowplowHandler(emitter, tracker, [
      ReviewedCorpusItemEventType.ADD_ITEM,
      ReviewedCorpusItemEventType.UPDATE_ITEM,
      ReviewedCorpusItemEventType.REMOVE_ITEM,
      ReviewedCorpusItemEventType.REJECT_ITEM,
    ]);

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

    // make sure we only have bad events
    const allEvents = await waitForSnowplowEvents(4);
    expect(allEvents.total).toEqual(4);
    expect(allEvents.good).toEqual(0);
    expect(allEvents.bad).toEqual(4);

    const badEvents = await getBadSnowplowEvents();

    // make sure each bad event is due to an unsupported app_id
    for (let i = 0; i < badEvents.length; i++) {
      expect(
        JSON.stringify(badEvents[i].errors).indexOf(
          'Discarding event for unsupported app_id',
        ),
      ).toBeGreaterThan(0);
    }
  });
});
