import {
  buildSelfDescribingEvent,
  Tracker,
  SelfDescribingEvent,
  SelfDescribingJson,
} from '@snowplow/node-tracker';

import config from '../config';
import {
  SnowplowScheduledCorpusCandidateErrorName,
  SnowplowScheduledCorpusCandidate,
} from './types';
import { ScheduledCandidate } from '../types';

/**
 * creates an object_update Snowplow event for scheduled_corpus_candidate
 *
 * @returns SelfDescribingEvent
 */
export const generateEvent = (): SelfDescribingEvent => {
  return {
    event: {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: 'scheduled_corpus_candidate_generated',
        object: 'scheduled_corpus_candidate',
      },
    },
  };
};

/**
 * generates a scheduled_corpus_candidate entity being sent to snowplow
 *
 * @param scheduledCorpusCandidate PocketAnalyticsArticle
 * @returns SelfDescribingJson
 */
export const generateContext = (
  scheduledCorpusCandidate: SnowplowScheduledCorpusCandidate,
): SelfDescribingJson => {
  return {
    schema: config.snowplow.schemas.scheduled_corpus_candidate,
    data: scheduledCorpusCandidate,
  };
};

/**
 *
 * @param candidate ML candidate
 * @param errorName Snowplow structured error
 * @param errorDescription Longer human-readable description of the error
 */
export const generateSnowplowErrorEntity = (
  candidate: ScheduledCandidate,
  errorName: SnowplowScheduledCorpusCandidateErrorName,
  errorDescription: string,
): SnowplowScheduledCorpusCandidate => {
  return {
    scheduled_corpus_candidate_id: candidate.scheduled_corpus_candidate_id,
    candidate_url: candidate.scheduled_corpus_item.url,
    features: candidate.features,
    run_details: candidate.run_details,
    error_name: errorName,
    error_description: errorDescription,
  };
};

/**
 *
 * @param candidate ML candidate
 * @param approvedCorpusItemId Identifier the item added to the corpus
 */
export const generateSnowplowSuccessEntity = (
  candidate: ScheduledCandidate,
  approvedCorpusItemId: string,
): SnowplowScheduledCorpusCandidate => {
  return {
    scheduled_corpus_candidate_id: candidate.scheduled_corpus_candidate_id,
    candidate_url: candidate.scheduled_corpus_item.url,
    approved_corpus_item_external_id: approvedCorpusItemId,
    features: candidate.features,
    run_details: candidate.run_details,
    // TODO: set scheduled_corpus_item_external_id
  };
};

/**
 * main entry point to snowplow. queues up an event to send.
 *
 * (elsewhere, we tell snowplow to send all queued events.)
 *
 * @param tracker TrackerInterface
 * @param entity Entity representing the result of trying to schedule a candidate.
 */
export const queueSnowplowEvent = (
  tracker: Tracker,
  entity: SnowplowScheduledCorpusCandidate,
) => {
  const event = generateEvent();
  const contexts: SelfDescribingJson[] = [generateContext(entity)];

  // reminder - this method is not async and does not directly initiate
  // any http request. it sends the event to a queue internal to the
  // snowplow module, which has its own logic on when to flush the queue.
  tracker.track(buildSelfDescribingEvent(event), contexts);
};
