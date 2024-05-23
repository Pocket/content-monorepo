import * as Sentry from '@sentry/node';
import {
  buildSelfDescribingEvent,
  Tracker,
  SelfDescribingEvent,
  SelfDescribingJson,
} from '@snowplow/node-tracker';

import config from '../config';
import { SnowplowProspect } from 'content-common';
import { serverLogger } from '../express';

/**
 * creates a snowplow event object
 *
 * @param eventName string - the name of the event from dynamo
 * @returns SelfDescribingEvent
 */
export const generateEvent = (eventName: string): SelfDescribingEvent => {
  return {
    event: {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: eventName.toLowerCase(),
        object: 'prospect',
      },
    },
  };
};

/**
 * generates JSON for an entity (prospect) being sent to snowplow
 *
 * @param prospect PocketAnalyticsArticle
 * @returns SelfDescribingJson
 */
export const generateContext = (
  prospect: SnowplowProspect,
): SelfDescribingJson => {
  return {
    schema: config.snowplow.schemas.prospect,
    data: prospect,
  };
};

/**
 * main entry point to snowplow. queues up an event to send.
 *
 * (elsewhere, we tell snowplow to send all queued events.)
 *
 * @param tracker TrackerInterface
 * @param eventName string
 * @param prospect SnowplowProspect
 * @returns void
 */
export const queueSnowplowEvent = (
  tracker: Tracker,
  eventName: string,
  prospect: SnowplowProspect,
): void => {
  const event = generateEvent(eventName);
  const contexts: SelfDescribingJson[] = [generateContext(prospect)];

  try {
    // reminder - this method is not async and does not directly initiate
    // any http request. it sends the event to a queue internal to the
    // snowplow module, which has its own logic on when to flush the queue.
    tracker.track(buildSelfDescribingEvent(event), contexts);
  } catch (ex) {
    // send the error to sentry and log it for investigation purposes
    const message = `Failed to send event to snowplow.\n event: ${event}\n contexts: ${contexts}`;
    serverLogger.error('Failed to send event to snowplow', {
      event: event,
      contexts: contexts,
    });
    Sentry.addBreadcrumb({ message });
    Sentry.captureException(ex);
  }
};
