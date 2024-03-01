import {
  buildSelfDescribingEvent,
  Tracker,
  SelfDescribingEvent,
  SelfDescribingJson,
} from '@snowplow/node-tracker';

import config from '../config';
import { SnowplowScheduledCorpusCandidate } from './types';

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
 * main entry point to snowplow. queues up an event to send.
 *
 * (elsewhere, we tell snowplow to send all queued events.)
 *
 * @param tracker TrackerInterface
 * @param prospect SnowplowProspect
 */
export const queueSnowplowEvent = (
  tracker: Tracker,
  prospect: SnowplowScheduledCorpusCandidate,
) => {
  const event = generateEvent();
  const contexts: SelfDescribingJson[] = [generateContext(prospect)];

  // reminder - this method is not async and does not directly initiate
  // any http request. it sends the event to a queue internal to the
  // snowplow module, which has its own logic on when to flush the queue.
  tracker.track(buildSelfDescribingEvent(event), contexts);
};
