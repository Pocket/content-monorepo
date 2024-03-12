import { CuratedCorpusSnowplowHandler } from './CuratedCorpusSnowplowHandler';
import {
  ApprovedCorpusItemPayload,
  BaseEventData,
  ReviewedCorpusItemPayload,
} from '../types';
import { buildSelfDescribingEvent, Tracker } from '@snowplow/node-tracker';
import { SelfDescribingJson } from '@snowplow/tracker-core';
import config from '../../config';
import { ReviewedItemSnowplowEventMap } from './types';
import {
  CorpusReviewStatus,
  CuratedCorpusItemUpdate,
  ObjectVersion,
  ReviewedCorpusItem,
} from './schema';
import { getUnixTimestamp } from '../../shared/utils';
import { RejectedCuratedCorpusItem } from '@prisma/client';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import {
  ApprovedItemAuthor,
  CorpusItemSource,
  CuratedStatus,
} from 'content-common';

type CuratedCorpusItemUpdateEvent = Omit<SelfDescribingJson, 'data'> & {
  data: CuratedCorpusItemUpdate;
};

type ReviewedCorpusItemContext = Omit<SelfDescribingJson, 'data'> & {
  data: ReviewedCorpusItem;
};

export class ReviewedItemSnowplowHandler extends CuratedCorpusSnowplowHandler {
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
  async process(
    data: ReviewedCorpusItemPayload & BaseEventData,
  ): Promise<void> {
    const event = buildSelfDescribingEvent({
      event: ReviewedItemSnowplowHandler.generateItemUpdateEvent(data),
    });
    const context = await ReviewedItemSnowplowHandler.generateEventContext(
      data,
    );
    await super.track(event, context);
  }

  /**
   * @private
   */
  private static async generateEventContext(
    data: ReviewedCorpusItemPayload,
  ): Promise<SelfDescribingJson[]> {
    return [await ReviewedItemSnowplowHandler.generateItemContext(data)];
  }

  private static generateItemUpdateEvent(
    data: ReviewedCorpusItemPayload & BaseEventData,
  ): CuratedCorpusItemUpdateEvent {
    return {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: ReviewedItemSnowplowEventMap[data.eventType],
        object: 'reviewed_corpus_item',
      },
    };
  }

  /**
   * @private
   */
  private static async generateItemContext(
    data: ReviewedCorpusItemPayload,
  ): Promise<ReviewedCorpusItemContext> {
    const result: ReviewedCorpusItemPayload = await data;
    const item = result.reviewedCorpusItem;

    // Resolve item status, since rejected items don't have status recorded -
    // they're all rejected, it's right in the name!
    // Also, figure out if item is approved or rejected.
    let isApprovedItem = false;
    let corpusReviewStatus: CorpusReviewStatus;

    if (item['status']) {
      corpusReviewStatus =
        item['status'] === CuratedStatus.RECOMMENDATION
          ? CorpusReviewStatus.RECOMMENDATION
          : CorpusReviewStatus.CORPUS;
      isApprovedItem = true;
    } else {
      corpusReviewStatus = CorpusReviewStatus.REJECTED;
    }

    // Set up common properties returned by both approved and rejected corpus items
    let context: ReviewedCorpusItemContext = {
      schema: config.snowplow.schemas.reviewedCorpusItem,
      data: {
        object_version: ObjectVersion.NEW,
        url: item.url,
        corpus_review_status: corpusReviewStatus,
        // manually added items do not have a prospectId
        prospect_id: item.prospectId || undefined,
        // TODO: consider removing the `||` part once legacy Curation data is fully migrated to Curated Corpus.
        topic: item.topic || undefined,
        created_at: getUnixTimestamp(item.createdAt),
        created_by: item.createdBy,
      },
    };

    // Additionally, send in everything we have for approved curated items
    if (isApprovedItem) {
      context = ReviewedItemSnowplowHandler.generateApprovedItemContext(
        item as ApprovedCorpusItemPayload,
        context,
      );
    } else {
      context = ReviewedItemSnowplowHandler.generateRejectedItemContext(
        item as RejectedCuratedCorpusItem,
        context,
      );
    }

    return context;
  }

  private static generateApprovedItemContext(
    item: ApprovedCorpusItemPayload,
    context: ReviewedCorpusItemContext,
  ): ReviewedCorpusItemContext {
    context.data = {
      ...context.data,
      title: item.title,
      language: item.language,
      excerpt: item.excerpt,
      publisher: item.publisher,
      // we only send author name to snowplow, not the sort order
      authors: item.authors.map((author: ApprovedItemAuthor) => author.name),
      image_url: item.imageUrl,
      is_collection: item.isCollection,
      is_syndicated: item.isSyndicated,
      is_time_sensitive: item.isTimeSensitive,
      approved_corpus_item_external_id: item.externalId,
      updated_at: getUnixTimestamp(item.updatedAt),
      updated_by: item.updatedBy ?? undefined,
      loaded_from: item.source as CorpusItemSource,
      // temporarily set to `undefined` until snowplow schema is updated
      // https://mozilla-hub.atlassian.net/browse/MC-814
      manually_loaded_reasons: undefined,
      manually_loaded_reason_comment: undefined,
    };

    return context;
  }

  private static generateRejectedItemContext(
    item: RejectedCuratedCorpusItem,
    context: ReviewedCorpusItemContext,
  ): ReviewedCorpusItemContext {
    context.data = {
      ...context.data,
      rejected_corpus_item_external_id: item.externalId,
      rejection_reasons: item.reason.split(','),
    };

    // Curators are not required to fill in the `title` field if it's missing
    // from the prospects stream (e.g., the Parser hasn't supplied it when parsing
    // the URL), so we only send it to Snowplow if the data is there.
    if (item.title) {
      context.data = { ...context.data, title: item.title };
    }

    // And we do the exact same thing for the `language` field.
    if (item.language) {
      context.data = { ...context.data, language: item.language };
    }

    return context;
  }
}
