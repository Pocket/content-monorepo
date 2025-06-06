import fetch from 'node-fetch';
import config from './config';
import {
  buildSelfDescribingEvent,
  PayloadBuilder,
} from '@snowplow/node-tracker';

export interface SnowplowMicroEventCounts {
  /** Total number of Snowplow events received. */
  total: number;
  /** Number of valid Snowplow events received. */
  good: number;
  /** Number of invalid Snowplow events received. */
  bad: number;
}

export async function snowplowRequest(
  path: string,
  post = false,
): Promise<any> {
  const response = await fetch(
    `${config.snowplow.httpProtocol}://${config.snowplow.endpoint}${path}`,
    {
      method: post ? 'POST' : 'GET',
    },
  );
  return await response.json();
}

/**
 * Resets the event counts in Snowplow Micro.
 */
export async function resetSnowplowEvents(): Promise<void> {
  // Wait a bit for any in-flight Snowplow events from unrelated tests to arrive at Snowplow.
  await new Promise((resolve) => setTimeout(resolve, 500));
  await snowplowRequest('/micro/reset', true);
}

export async function getAllSnowplowEvents(): Promise<SnowplowMicroEventCounts> {
  return snowplowRequest('/micro/all');
}

export async function getGoodSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/good');
}

export async function getBadSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/bad');
}

export function parseSnowplowData(data: string): { [key: string]: any } {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}

/**
 * Waits until Snowplow events are received and returns counts.
 * @param maxWaitTime Maximum time to wait. By default, this is 4 seconds, which is less than the default Jest test
 * timeout of 5 seconds. In practice Snowplow Micro (running locally) receives events in a few milliseconds.
 * @param expectedEventCount Waits until this number of events (good or bad) are received.
 * @return Counts for the number of Snowplow events received (total, good, bad).
 */
export async function waitForSnowplowEvents(
  expectedEventCount: number = 1,
  maxWaitTime: number = 4000,
): Promise<SnowplowMicroEventCounts> {
  let totalWaitTime = 0;
  // Snowplow tests take about 20ms. waitPeriod is set to half of that to minimize waiting.
  const waitPeriod = 10;

  while (totalWaitTime < maxWaitTime) {
    const eventCounts = await getAllSnowplowEvents();
    // TODO why is this >= and not === ?
    // if it's greater than expected, that seems to say it hasn't been properly cleared
    if (eventCounts.total >= expectedEventCount) {
      return eventCounts;
    } else {
      await new Promise((resolve) => setTimeout(resolve, waitPeriod));
      totalWaitTime += waitPeriod;
    }
  }

  return await getAllSnowplowEvents();
}

/**
 * Generates an object_update Snowplow event
 * @param overrideData Optionally, allows the event data to be changed.
 */
export const generateObjectUpdateEvent = (
  overrideData = {},
): PayloadBuilder => {
  return buildSelfDescribingEvent({
    event: {
      schema: 'iglu:com.pocket/object_update/jsonschema/1-0-17',
      data: {
        trigger: 'scheduled_corpus_candidate_generated',
        object: 'scheduled_corpus_candidate',
        ...overrideData,
      },
    },
  });
};
