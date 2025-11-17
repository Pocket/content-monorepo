import { CuratedStatus } from '.prisma/client';
import {
  getGoodSnowplowEvents,
  parseSnowplowData,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common';
import { assertValidSnowplowObjectUpdateEvents } from '../../test/helpers/snowplow';
import config from '../../config';
import { SectionItemEventType, SectionItemPayload } from '../types';
import { ObjectVersion } from './schema';
import { SectionItemSnowplowHandler } from './SectionItemSnowplowHandler';
import { tracker } from './tracker';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { getUnixTimestamp } from '../../shared/utils';
import {
  ActivitySource,
  CorpusItemSource,
  Topics,
} from 'content-common';
import { SectionItem } from '../../database/types';

/**
 * Use a simple mock section item instead of using DB helpers
 * so that these tests can be run in the IDE
 */
const mockSectionItem: SectionItem = {
  id: 1,
  externalId: 'section-item-123-abc',
  sectionId: 1,
  approvedItemId: 123,
  rank: 1,
  active: true,
  deactivateReasons: null,
  deactivateSource: null,
  deactivatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  section: {
    id: 1,
    externalId: 'section-789-xyz',
    title: 'Test Section',
    description: 'Test Description',
    heroTitle: null,
    heroDescription: null,
    scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    iab: null,
    sort: null,
    active: true,
    deactivateSource: null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createSource: ActivitySource.ML,
    updateSource: null,
    disabled: false,
    startDate: null,
    endDate: null,
  },
  approvedItem: {
    id: 123,
    externalId: '123-abc',
    prospectId: '456-dfg',
    url: 'https://test.com/a-story',
    domainName: 'test.com',
    status: CuratedStatus.CORPUS,
    title: 'Everything you need to know about TypeScript',
    excerpt: 'Something here',
    publisher: 'Tech Publishing House',
    datePublished: null,
    imageUrl: 'https://test.com/image.png',
    language: 'EN',
    topic: Topics.TECHNOLOGY,
    source: CorpusItemSource.MANUAL,
    isCollection: false,
    isSyndicated: false,
    isTimeSensitive: false,
    createdAt: new Date(),
    createdBy: 'Sarah',
    updatedAt: new Date(),
    updatedBy: 'Sarah',
    authors: [{ name: 'Jane Doe', sortOrder: 1 }],
  },
};

const sectionItemEventData: SectionItemPayload = {
  sectionItem: mockSectionItem,
};

const sectionItemEventContextData = {
  object_version: ObjectVersion.NEW,
  section_item_external_id: mockSectionItem.externalId,
  section_external_id: mockSectionItem.section.externalId,
  approved_corpus_item_external_id: mockSectionItem.approvedItem.externalId,
  url: mockSectionItem.approvedItem.url,
  rank: mockSectionItem.rank,
  active: mockSectionItem.active,
  created_at: getUnixTimestamp(mockSectionItem.createdAt),
  updated_at: getUnixTimestamp(mockSectionItem.updatedAt),
};

function assertValidSnowplowSectionItemEvents(data) {
  const eventContext = parseSnowplowData(data);

  expect(eventContext.data).toMatchObject([
    {
      schema: config.snowplow.schemas.sectionItem,
      data: sectionItemEventContextData,
    },
  ]);
}

describe('SectionItemSnowplowHandler', () => {
  const emitter = new CuratedCorpusEventEmitter();

  new SectionItemSnowplowHandler(emitter, tracker, [
    SectionItemEventType.ADD_SECTION_ITEM,
    SectionItemEventType.REMOVE_SECTION_ITEM,
  ]);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send good events to Snowplow on section item operations', async () => {
    emitter.emit(SectionItemEventType.ADD_SECTION_ITEM, {
      ...sectionItemEventData,
      eventType: SectionItemEventType.ADD_SECTION_ITEM,
    });

    emitter.emit(SectionItemEventType.REMOVE_SECTION_ITEM, {
      ...sectionItemEventData,
      eventType: SectionItemEventType.REMOVE_SECTION_ITEM,
    });

    // make sure we only have good events
    const allEvents = await waitForSnowplowEvents(2);
    expect(allEvents.total).toEqual(2);
    expect(allEvents.good).toEqual(2);
    expect(allEvents.bad).toEqual(0);

    const goodEvents = await getGoodSnowplowEvents();

    assertValidSnowplowSectionItemEvents(goodEvents[0].rawEvent.parameters.cx);
    assertValidSnowplowSectionItemEvents(goodEvents[1].rawEvent.parameters.cx);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['section_item_added', 'section_item_removed'],
      'section_item',
    );
  });

  describe('deactivate reasons', () => {
    it('should handle deactivate reasons when removing a section item', async () => {
      const sectionItemWithReasons: SectionItemPayload = {
        sectionItem: {
          ...mockSectionItem,
          active: false,
          deactivateReasons: ['POLICY_VIOLATION', 'OUTDATED'],
          deactivateSource: ActivitySource.MANUAL,
          deactivatedAt: new Date(),
        },
      };

      emitter.emit(SectionItemEventType.REMOVE_SECTION_ITEM, {
        ...sectionItemWithReasons,
        eventType: SectionItemEventType.REMOVE_SECTION_ITEM,
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
          schema: config.snowplow.schemas.sectionItem,
          data: {
            ...sectionItemEventContextData,
            active: false,
            deactivate_reasons: ['POLICY_VIOLATION', 'OUTDATED'],
            deactivate_source: ActivitySource.MANUAL,
            deactivated_at: getUnixTimestamp(
              sectionItemWithReasons.sectionItem.deactivatedAt,
            ),
          },
        },
      ]);
    });
  });

  describe('ML sourced section items', () => {
    it('should handle section items deactivated by ML', async () => {
      const sectionItemWithMl: SectionItemPayload = {
        sectionItem: {
          ...mockSectionItem,
          active: false,
          deactivateSource: ActivitySource.ML,
          deactivatedAt: new Date(),
        },
      };

      emitter.emit(SectionItemEventType.REMOVE_SECTION_ITEM, {
        ...sectionItemWithMl,
        eventType: SectionItemEventType.REMOVE_SECTION_ITEM,
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
          schema: config.snowplow.schemas.sectionItem,
          data: {
            ...sectionItemEventContextData,
            active: false,
            deactivate_source: ActivitySource.ML,
            deactivated_at: getUnixTimestamp(
              sectionItemWithMl.sectionItem.deactivatedAt,
            ),
          },
        },
      ]);
    });
  });

  describe('optional fields', () => {
    it('should handle section items without rank', async () => {
      const sectionItemNoRank: SectionItemPayload = {
        sectionItem: {
          ...mockSectionItem,
          rank: null,
        },
      };

      emitter.emit(SectionItemEventType.ADD_SECTION_ITEM, {
        ...sectionItemNoRank,
        eventType: SectionItemEventType.ADD_SECTION_ITEM,
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

      // Verify that rank is undefined when null
      expect(eventContext.data[0].data.rank).toBeUndefined();
    });
  });
});
