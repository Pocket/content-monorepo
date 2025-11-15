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

    const deactivateReasons = (sectionItem.deactivateReasons as string[] | null) ?? undefined;

    // Set up data to be returned
    const context: SectionItemContext = {
      schema: config.snowplow.schemas.sectionItem,
      data: {
        object_version: ObjectVersion.NEW,
        section_item_external_id: sectionItem.externalId,
        section_external_id: sectionItem.section.externalId,
        approved_corpus_item_external_id:
          sectionItem.approvedItem.externalId,
        url: sectionItem.approvedItem.url,
        rank: sectionItem.rank ?? undefined,
        active: sectionItem.active,
        deactivate_reasons: deactivateReasons,
        deactivate_source: (sectionItem.deactivateSource ?? undefined) as ActivitySource | undefined,
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
