import {
  getAllSnowplowEvents,
  getGoodSnowplowEvents,
  parseSnowplowData,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common';
import { assertValidSnowplowObjectUpdateEvents } from '../../test/helpers/snowplow';
import config from '../../config';
import { SectionEventType, SectionPayload } from '../types';
import { ObjectVersion } from './schema';
import { SectionSnowplowHandler } from './SectionSnowplowHandler';
import { tracker } from './tracker';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { getUnixTimestamp } from '../../shared/utils';
import { ActivitySource } from 'content-common';
import { getScheduledSurfaceByGuid } from '../../shared/utils';
import { Section } from '../../database/types';

/**
 * Use a simple mock section instead of using DB helpers
 * so that these tests can be run in the IDE
 */
const mockSection: Section = {
  id: 1,
  externalId: 'section-123-abc',
  title: 'Test Section',
  description: 'A test section for events',
  heroTitle: 'Hero Title',
  heroDescription: 'Hero Description',
  scheduledSurfaceGuid: 'NEW_TAB_EN_US',
  iab: { taxonomy: 'IAB-3.0', categories: ['IAB1', 'IAB2'] },
  sort: 1,
  active: true,
  disabled: false,
  createSource: ActivitySource.MANUAL,
  deactivateSource: null,
  updateSource: null,
  deactivatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
};

const sectionEventData: SectionPayload = {
  section: mockSection,
};

const sectionEventContextData = {
  object_version: ObjectVersion.NEW,
  section_external_id: mockSection.externalId,
  title: mockSection.title,
  description: mockSection.description,
  hero_title: mockSection.heroTitle,
  hero_description: mockSection.heroDescription,
  scheduled_surface_id: mockSection.scheduledSurfaceGuid,
  sort: mockSection.sort,
  active: mockSection.active,
  disabled: mockSection.disabled,
  create_source: ActivitySource.MANUAL,
  created_at: getUnixTimestamp(mockSection.createdAt),
  updated_at: getUnixTimestamp(mockSection.updatedAt),
  start_date: getUnixTimestamp(mockSection.startDate),
  end_date: getUnixTimestamp(mockSection.endDate),
};

function assertValidSnowplowSectionEvents(data) {
  const eventContext = parseSnowplowData(data);

  expect(eventContext.data).toMatchObject([
    {
      schema: config.snowplow.schemas.section,
      data: sectionEventContextData,
    },
  ]);
}

describe('SectionSnowplowHandler', () => {
  const emitter = new CuratedCorpusEventEmitter();

  new SectionSnowplowHandler(emitter, tracker, [
    SectionEventType.CREATE_SECTION,
    SectionEventType.UPDATE_SECTION,
    SectionEventType.DELETE_SECTION,
  ]);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send good events to Snowplow on section operations', async () => {
    console.log('Emitting CREATE_SECTION event...');
    emitter.emit(SectionEventType.CREATE_SECTION, {
      ...sectionEventData,
      eventType: SectionEventType.CREATE_SECTION,
    });

    console.log('Emitting UPDATE_SECTION event...');
    emitter.emit(SectionEventType.UPDATE_SECTION, {
      ...sectionEventData,
      eventType: SectionEventType.UPDATE_SECTION,
    });

    console.log('Emitting DELETE_SECTION event...');
    emitter.emit(SectionEventType.DELETE_SECTION, {
      ...sectionEventData,
      eventType: SectionEventType.DELETE_SECTION,
    });

    console.log('Waiting for events...');
    // make sure we only have good events
    const allEvents = await waitForSnowplowEvents(3);
    console.log('Events received:', allEvents);

    // If there are bad events, log them for debugging
    if (allEvents.bad > 0) {
      const { getBadSnowplowEvents } = require('content-common');
      const badEvents = await getBadSnowplowEvents();
      console.log('Bad events details:', JSON.stringify(badEvents, null, 2));
    }

    // If no events at all, check bad events anyway
    if (allEvents.total === 0) {
      const { getBadSnowplowEvents } = require('content-common');
      const badEvents = await getBadSnowplowEvents();
      console.log('No events received. Checking bad events:', JSON.stringify(badEvents, null, 2));
    }

    expect(allEvents.total).toEqual(3);
    expect(allEvents.good).toEqual(3);
    expect(allEvents.bad).toEqual(0);

    const goodEvents = await getGoodSnowplowEvents();

    assertValidSnowplowSectionEvents(goodEvents[0].rawEvent.parameters.cx);
    assertValidSnowplowSectionEvents(goodEvents[1].rawEvent.parameters.cx);
    assertValidSnowplowSectionEvents(goodEvents[2].rawEvent.parameters.cx);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['section_added', 'section_updated', 'section_removed'],
      'section',
    );
  });

  describe('ML sourced sections', () => {
    it('should create a section with `ML` as the `create_source` value', async () => {
      const sectionWithMlData: SectionPayload = {
        section: {
          ...mockSection,
          createSource: ActivitySource.ML,
        },
      };

      emitter.emit(SectionEventType.CREATE_SECTION, {
        ...sectionWithMlData,
        eventType: SectionEventType.CREATE_SECTION,
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
          schema: config.snowplow.schemas.section,
          data: {
            ...sectionEventContextData,
            create_source: ActivitySource.ML,
          },
        },
      ]);
    });
  });

  describe('optional fields', () => {
    it('should handle sections without optional fields', async () => {
      const minimalSection: Section = {
        id: 2,
        externalId: 'section-minimal-456',
        title: 'Minimal Section',
        description: null,
        heroTitle: null,
        heroDescription: null,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        iab: null,
        sort: null,
        active: true,
        disabled: false,
        createSource: ActivitySource.MANUAL,
        deactivateSource: null,
        updateSource: null,
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: null,
        endDate: null,
      };

      emitter.emit(SectionEventType.CREATE_SECTION, {
        section: minimalSection,
        eventType: SectionEventType.CREATE_SECTION,
      });

      // wait a bit
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

      // Verify that undefined optional fields are not present
      expect(eventContext.data[0].data.description).toBeUndefined();
      expect(eventContext.data[0].data.hero_title).toBeUndefined();
      expect(eventContext.data[0].data.hero_description).toBeUndefined();
      expect(eventContext.data[0].data.iab).toBeUndefined();
      expect(eventContext.data[0].data.sort).toBeUndefined();
      expect(eventContext.data[0].data.start_date).toBeUndefined();
      expect(eventContext.data[0].data.end_date).toBeUndefined();
    });
  });
});
