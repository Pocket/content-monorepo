import { CuratedStatus } from '@prisma/client';
import {
  assertValidSnowplowObjectUpdateEvents,
  getAllSnowplowEvents,
  getGoodSnowplowEvents,
  parseSnowplowData,
  resetSnowplowEvents,
} from '../../test/helpers/snowplow';
import config from '../../config';
import {
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
} from '../types';
import { ObjectVersion } from './schema';
import { ScheduledItemSnowplowHandler } from './ScheduledItemSnowplowHandler';
import { tracker } from './tracker';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { getUnixTimestamp } from '../../shared/utils';
import {
  CorpusItemSource,
  ScheduledCorpusItemStatus,
  Topics,
} from '../../shared/types';
import { getScheduledSurfaceByGuid } from '../../shared/utils';
import { ScheduledItem } from '../../database/types';

/**
 * Use a simple mock item instead of using DB helpers
 * so that these tests can be run in the IDE
 */
const scheduledCorpusItem: ScheduledItem = {
  id: 789,
  externalId: '789-xyz',
  approvedItemId: 123,
  scheduledSurfaceGuid: 'NEW_TAB_EN_US',
  scheduledDate: new Date('2030-01-01'),
  createdAt: new Date(),
  createdBy: 'Amy',
  updatedAt: new Date(),
  updatedBy: 'Amy',

  approvedItem: {
    id: 123,
    externalId: '123-abc',
    prospectId: '456-dfg',
    url: 'https://test.com/a-story',
    status: CuratedStatus.RECOMMENDATION,
    title: 'Everything you need to know about React',
    excerpt: 'Something here',
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
    authors: [{ name: 'Octavia Butler', sortOrder: 1 }],
  },
};

const scheduledEventData: ScheduledCorpusItemPayload = {
  scheduledCorpusItem: {
    ...scheduledCorpusItem,
    generated_by: CorpusItemSource.MANUAL,
    // in the real world this should match the event type, but it's fine to
    // hard-code here just to ensure the value is making it to snowplow
    status: ScheduledCorpusItemStatus.REMOVED,
    reasons: ['TOPIC', 'PUBLISHER'],
    reasonComment: 'why did i rescheudle this? see above',
  },
};

function assertValidSnowplowScheduledItemEvents(data) {
  const eventContext = parseSnowplowData(data);

  expect(eventContext.data).toMatchObject([
    {
      schema: config.snowplow.schemas.scheduledCorpusItem,
      data: {
        object_version: ObjectVersion.NEW,
        scheduled_corpus_item_external_id: scheduledCorpusItem.externalId,
        approved_corpus_item_external_id:
          scheduledCorpusItem.approvedItem.externalId,
        url: scheduledCorpusItem.approvedItem.url,

        scheduled_at: getUnixTimestamp(scheduledCorpusItem.scheduledDate),
        scheduled_surface_id: scheduledCorpusItem.scheduledSurfaceGuid,
        scheduled_surface_name: getScheduledSurfaceByGuid(
          scheduledCorpusItem.scheduledSurfaceGuid,
        )?.name,
        scheduled_surface_iana_timezone: getScheduledSurfaceByGuid(
          scheduledCorpusItem.scheduledSurfaceGuid,
        )?.ianaTimezone,
        created_at: getUnixTimestamp(scheduledCorpusItem.createdAt),
        created_by: scheduledCorpusItem.createdBy,
        updated_at: getUnixTimestamp(scheduledCorpusItem.updatedAt),
        updated_by: scheduledCorpusItem.updatedBy,
        generated_by: CorpusItemSource.MANUAL,
        status: 'removed',
        status_reasons: ['TOPIC', 'PUBLISHER'],
        status_reason_comment: 'why did i rescheudle this? see above',
      },
    },
  ]);
}

describe('ScheduledItemSnowplowHandler', () => {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send good events to Snowplow on scheduled items', async () => {
    const emitter = new CuratedCorpusEventEmitter();
    new ScheduledItemSnowplowHandler(emitter, tracker, [
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    ]);
    emitter.emit(ScheduledCorpusItemEventType.ADD_SCHEDULE, {
      ...scheduledEventData,
      eventType: ScheduledCorpusItemEventType.ADD_SCHEDULE,
    });
    emitter.emit(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, {
      ...scheduledEventData,
      eventType: ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    });

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // make sure we only have good events
    const allEvents = await getAllSnowplowEvents();
    expect(allEvents.total).toEqual(2);
    expect(allEvents.good).toEqual(2);
    expect(allEvents.bad).toEqual(0);

    const goodEvents = await getGoodSnowplowEvents();

    assertValidSnowplowScheduledItemEvents(
      goodEvents[0].rawEvent.parameters.cx,
    );
    assertValidSnowplowScheduledItemEvents(
      goodEvents[1].rawEvent.parameters.cx,
    );

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['scheduled_corpus_item_added', 'scheduled_corpus_item_removed'],
      'scheduled_corpus_item',
    );
  });
});
