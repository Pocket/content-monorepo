import { CuratedCorpusSnowplowHandler } from './CuratedCorpusSnowplowHandler';
import { BaseEventData, SectionItemPayload } from '../types';
import { buildSelfDescribingEvent, Tracker } from '@snowplow/node-tracker';
import { SelfDescribingJson } from '@snowplow/tracker-core';
import config from '../../config';
import { SectionItemSnowplowEventMap } from './types';
import {
  CuratedCorpusItemUpdate,
  ObjectVersion,
  SectionItem,
} from './schema';
import { getUnixTimestamp } from '../../shared/utils';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { ActivitySource } from 'content-common';

type CuratedCorpusItemUpdateEvent = Omit<SelfDescribingJson, 'data'> & {
  data: CuratedCorpusItemUpdate;
};

type SectionItemContext = Omit<SelfDescribingJson, 'data'> & {
  data: SectionItem;
};

export class SectionItemSnowplowHandler extends CuratedCorpusSnowplowHandler {
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
  async process(data: SectionItemPayload & BaseEventData): Promise<void> {
    const event = buildSelfDescribingEvent({
      event: SectionItemSnowplowHandler.generateItemUpdateEvent(data),
    });

    const context = await SectionItemSnowplowHandler.generateEventContext(
      data,
    );

    await super.track(event, context);
  }

  /**
   * @private
   */
  private static async generateEventContext(
    data: SectionItemPayload,
  ): Promise<SelfDescribingJson[]> {
    return [await SectionItemSnowplowHandler.generateItemContext(data)];
  }

  private static generateItemUpdateEvent(
    data: SectionItemPayload & BaseEventData,
  ): CuratedCorpusItemUpdateEvent {
    return {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: SectionItemSnowplowEventMap[data.eventType],
        object: 'section_item',
      },
    };
  }

  /**
   * @private
   */
  private static async generateItemContext(
    data: SectionItemPayload,
  ): Promise<SectionItemContext> {
    const result: SectionItemPayload = await data;

    const sectionItem = result.sectionItem;

    // Parse deactivateReasons if it's a JSON string/object
    let deactivateReasons: string[] | undefined;
    if (sectionItem.deactivateReasons) {
      try {
        // If it's already parsed as an object, convert to array
        if (typeof sectionItem.deactivateReasons === 'object') {
          const reasons = Array.isArray(sectionItem.deactivateReasons)
            ? sectionItem.deactivateReasons
            : Object.values(sectionItem.deactivateReasons);
          // Filter to only include string values
          deactivateReasons = reasons.filter((r): r is string => typeof r === 'string');
        } else if (typeof sectionItem.deactivateReasons === 'string') {
          // If it's a JSON string, parse it
          const parsed = JSON.parse(sectionItem.deactivateReasons);
          if (Array.isArray(parsed)) {
            deactivateReasons = parsed.filter((r): r is string => typeof r === 'string');
          }
        }
      } catch (e) {
        // If parsing fails, leave it undefined
        deactivateReasons = undefined;
      }
    }

    // Set up data to be returned
    const context: SectionItemContext = {
      schema: config.snowplow.schemas.sectionItem,
      data: {
        object_version: ObjectVersion.NEW,
        section_item_external_id: sectionItem.externalId,
        section_external_id: sectionItem.section?.externalId ?? '',
        approved_corpus_item_external_id:
          sectionItem.approvedItem.externalId,
        url: sectionItem.approvedItem.url,
        rank: sectionItem.rank ?? undefined,
        active: sectionItem.active,
        deactivate_reasons: deactivateReasons,
        deactivate_source: sectionItem.deactivateSource as ActivitySource | undefined,
        deactivated_at: sectionItem.deactivatedAt
          ? getUnixTimestamp(sectionItem.deactivatedAt)
          : undefined,
        created_at: getUnixTimestamp(sectionItem.createdAt),
        updated_at: getUnixTimestamp(sectionItem.updatedAt),
        action_screen: sectionItem.action_screen ?? undefined,
      },
    };

    return context;
  }
}
