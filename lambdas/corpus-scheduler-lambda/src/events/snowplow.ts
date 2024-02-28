import * as Sentry from '@sentry/node';
import {
  gotEmitter,
  HttpMethod,
  HttpProtocol,
  tracker as snowPlowTracker,
  buildSelfDescribingEvent,
  Emitter,
  Tracker,
  SelfDescribingEvent,
  SelfDescribingJson,
} from '@snowplow/node-tracker';
import { Response, RequestError } from 'got';

import config from '../config';
import { SnowplowScheduledCorpusCandidate } from './types';

let emitter: Emitter;
let tracker: Tracker;

/**
 * lazy instantiation of a snowplow emitter
 *
 * @returns Emitter
 */
export function getEmitter(): Emitter {
  if (!emitter) {
    emitter = gotEmitter(
      config.snowplow.endpoint,
      config.snowplow.httpProtocol as HttpProtocol,
      undefined,
      HttpMethod.POST,
      config.snowplow.bufferSize,
      config.snowplow.retries,
      undefined,
      // this is the callback function invoked after snowplow flushes their
      // internal cache.
      (error?: RequestError, response?: Response<string>) => {
        if (error) {
          Sentry.addBreadcrumb({ message: 'Emitter Data', data: error });
          Sentry.captureMessage(`Emitter Error`);
        }
      },
    );
  }

  return emitter;
}

/**
 * lazy instantiation of a snowplow tracker
 * @param emitter Emitter - a snowplow emitter
 * @returns Tracker
 */
export const getTracker = (emitter: Emitter): Tracker => {
  if (!tracker) {
    tracker = snowPlowTracker(
      emitter,
      config.snowplow.namespace,
      config.snowplow.appId,
      true,
    );
  }

  return tracker;
};

/**
 * creates a snowplow event object
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
 * @returns void
 */
export const queueSnowplowEvent = (
  tracker: Tracker,
  prospect: SnowplowScheduledCorpusCandidate,
): void => {
  const event = generateEvent();
  const contexts: SelfDescribingJson[] = [generateContext(prospect)];

  try {
    // reminder - this method is not async and does not directly initiate
    // any http request. it sends the event to a queue internal to the
    // snowplow module, which has its own logic on when to flush the queue.
    tracker.track(buildSelfDescribingEvent(event), contexts);
  } catch (ex) {
    // send the error to sentry and log it for investigation purposes
    const message = `Failed to send event to snowplow.\n event: ${event}\n contexts: ${contexts}`;
    Sentry.addBreadcrumb({ message });
    Sentry.captureException(ex);
  }
};
