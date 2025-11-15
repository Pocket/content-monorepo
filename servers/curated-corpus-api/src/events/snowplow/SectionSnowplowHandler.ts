import { CuratedCorpusSnowplowHandler } from './CuratedCorpusSnowplowHandler';
import { BaseEventData, SectionPayload } from '../types';
import { buildSelfDescribingEvent, Tracker } from '@snowplow/node-tracker';
import { SelfDescribingJson } from '@snowplow/tracker-core';
import config from '../../config';
import { SectionSnowplowEventMap } from './types';
import { CuratedCorpusItemUpdate, ObjectVersion, Section } from './schema';
import { getUnixTimestamp } from '../../shared/utils';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { ActivitySource, IABMetadata } from 'content-common';

type CuratedCorpusItemUpdateEvent = Omit<SelfDescribingJson, 'data'> & {
  data: CuratedCorpusItemUpdate;
};

type SectionContext = Omit<SelfDescribingJson, 'data'> & {
  data: Section;
};

export class SectionSnowplowHandler extends CuratedCorpusSnowplowHandler {
  constructor(
    protected emitter: CuratedCorpusEventEmitter,
    protected tracker: Tracker,
    events: string[],
  ) {
    super(emitter, tracker, events);
  }

  /**
   * @param data
   */
  async process(data: SectionPayload & BaseEventData): Promise<void> {
    const event = buildSelfDescribingEvent({
      event: SectionSnowplowHandler.generateItemUpdateEvent(data),
    });

    const context = await SectionSnowplowHandler.generateEventContext(data);

    await super.track(event, context);
  }

  /**
   * @private
   */
  private static async generateEventContext(
    data: SectionPayload,
  ): Promise<SelfDescribingJson[]> {
    return [await SectionSnowplowHandler.generateItemContext(data)];
  }

  private static generateItemUpdateEvent(
    data: SectionPayload & BaseEventData,
  ): CuratedCorpusItemUpdateEvent {
    return {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: SectionSnowplowEventMap[data.eventType],
        object: 'section',
      },
    };
  }

  /**
   * @private
   */
  private static async generateItemContext(
    data: SectionPayload,
  ): Promise<SectionContext> {
    const result: SectionPayload = await data;

    const section = result.section;

    // Set up data to be returned
    const context: SectionContext = {
      schema: config.snowplow.schemas.section,
      data: {
        object_version: ObjectVersion.NEW,
        section_external_id: section.externalId,
        title: section.title,
        description: section.description ?? undefined,
        hero_title: section.heroTitle ?? undefined,
        hero_description: section.heroDescription ?? undefined,
        scheduled_surface_id: section.scheduledSurfaceGuid,
        /* eslint-disable prettier/prettier */
        iab: section.iab
          ? JSON.stringify({
            taxonomy: (section.iab as IABMetadata).taxonomy,
            categories: (section.iab as IABMetadata).categories,
          })
          : undefined,
        /* eslint-enable prettier/prettier */
        sort: section.sort ?? undefined,
        active: section.active,
        disabled: section.disabled,
        create_source: section.createSource as ActivitySource,
        deactivate_source: (section.deactivateSource ?? undefined) as ActivitySource | undefined,
        update_source: (section.updateSource ?? undefined) as ActivitySource | undefined,
        deactivated_at: section.deactivatedAt
          ? getUnixTimestamp(section.deactivatedAt)
          : undefined,
        created_at: getUnixTimestamp(section.createdAt),
        updated_at: getUnixTimestamp(section.updatedAt),
        start_date: section.startDate
          ? getUnixTimestamp(section.startDate)
          : undefined,
        end_date: section.endDate
          ? getUnixTimestamp(section.endDate)
          : undefined,
        action_screen: section.action_screen ?? undefined,
      },
    };

    return context;
  }
}
