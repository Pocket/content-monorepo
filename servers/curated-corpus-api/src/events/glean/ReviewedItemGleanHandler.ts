import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { serverLogger } from '@pocket-tools/ts-logger';
import * as Sentry from '@sentry/node';
import { createEventsServerEventLogger } from './generated/server_events';

import {
  ApprovedCorpusItemPayload,
  BaseEventData,
  RejectedCorpusItemPayload,
  ReviewedCorpusItemPayload,
} from '../types';
import { CuratedStatus } from '.prisma/client';
import { getUnixTimestamp } from '../../shared/utils';
import { CorpusItemSource } from 'content-common';
import { CorpusReviewStatus } from '../snowplow/schema';

const gleanLogger = createEventsServerEventLogger({
  applicationId: 'curated-corpus-api',
  appDisplayVersion: '1.0.0',
  channel: 'production',
  logger_options: { app: 'glean-logger' },
});

export class ReviewedItemGleanHandler {
  constructor(
    protected emitter: CuratedCorpusEventEmitter,
    events: string[]
  ) {
    events.forEach((eventName) => {
      this.emitter.on(eventName, (data) => this.process(data));
    });
  }

  async process(data: ReviewedCorpusItemPayload & BaseEventData) {
    try {
      const gleanExtras = ReviewedItemGleanHandler.buildGleanExtras(data);

      gleanLogger.recordCuratedCorpusReviewedCorpusItem({
        user_agent: 'unknown',
        ip_address: 'unknown',
        ...gleanExtras,
        experimental_json: gleanExtras.experimental_json ?? '',
      });
    } catch (ex) {
      serverLogger.error('ReviewedItemGleanHandler: failed to record Glean event', {
        error: ex,
        eventType: data.eventType,
      });
      Sentry.captureException(ex);
    }
  }

  private static buildGleanExtras(data: ReviewedCorpusItemPayload & BaseEventData) {
    const item = data.reviewedCorpusItem;

    let isApproved = false;
    let corpusReviewStatus: string;
    let approvedExternalId = '';
    let rejectedExternalId = '';
    let rejectionReasons = '';

    if ((item as ApprovedCorpusItemPayload).status !== undefined) {
      const status = (item as ApprovedCorpusItemPayload).status;
      corpusReviewStatus =
        status === CuratedStatus.RECOMMENDATION
          ? CorpusReviewStatus.RECOMMENDATION
          : CorpusReviewStatus.CORPUS;
      isApproved = true;
      approvedExternalId = (item as ApprovedCorpusItemPayload).externalId;
    } else {
      corpusReviewStatus = CorpusReviewStatus.REJECTED;
      rejectedExternalId = (item as RejectedCorpusItemPayload).externalId;
      if ((item as RejectedCorpusItemPayload).reason) {
        rejectionReasons = JSON.stringify(
          (item as RejectedCorpusItemPayload).reason.split(',')
        );
      }
    }

    return {
      object_version: 'new',
      approved_corpus_item_external_id: isApproved ? approvedExternalId : '',
      rejected_corpus_item_external_id: isApproved ? '' : rejectedExternalId,
      prospect_id: item.prospectId ?? '',
      url: item.url ?? '',
      loaded_from: '', // TODO:  Property 'source' does not exist on type 'ApprovedCorpusItemPayload | RejectedCorpusItemPayload'
      corpus_review_status: corpusReviewStatus,
      rejection_reasons_json: rejectionReasons,
      action_screen: (item as any).action_screen ?? '',
      title: item.title ?? '',
      excerpt: isApproved ? (item as ApprovedCorpusItemPayload).excerpt ?? '' : '',
      image_url: isApproved ? (item as ApprovedCorpusItemPayload).imageUrl ?? '' : '',
      language: item.language ?? '',
      topic: item.topic ?? '',
      is_collection: isApproved ? !!(item as ApprovedCorpusItemPayload).isCollection : false,
      is_syndicated: isApproved ? !!(item as ApprovedCorpusItemPayload).isSyndicated : false,
      is_time_sensitive: isApproved ? !!(item as ApprovedCorpusItemPayload).isTimeSensitive : false,
      created_at: item.createdAt ? getUnixTimestamp(item.createdAt).toString() : '',
      created_by: item.createdBy ?? '',
      updated_at: isApproved && (item as ApprovedCorpusItemPayload).updatedAt
        ? getUnixTimestamp((item as ApprovedCorpusItemPayload).updatedAt).toString()
        : '',
      updated_by: isApproved ? (item as ApprovedCorpusItemPayload).updatedBy ?? '' : '',
      authors_json: isApproved && (item as ApprovedCorpusItemPayload).authors
        ? JSON.stringify((item as ApprovedCorpusItemPayload).authors.map((a) => a.name))
        : '',
      publisher: isApproved ? (item as ApprovedCorpusItemPayload).publisher ?? '' : '',
      experimental_json: '',
    };
  }
}
