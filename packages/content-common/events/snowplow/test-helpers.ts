import fetch from 'node-fetch';
import config from './config';

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

export async function resetSnowplowEvents(): Promise<void> {
  await snowplowRequest('/micro/reset', true);
}

export async function getAllSnowplowEvents(): Promise<{ [key: string]: any }> {
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

export async function waitForSnowplowEvents(
  maxWaitTime: number = 5000,
  expectedEventCount: number = 1,
): Promise<{ [key: string]: any }> {
  let totalWaitTime = 0;
  // Snowplow tests take about 20ms. waitPeriod is set to half of that to minimize waiting.
  const waitPeriod = 10;

  while (totalWaitTime < maxWaitTime) {
    const eventCounts = await getAllSnowplowEvents();
    if (eventCounts.total >= expectedEventCount) {
      return eventCounts;
    } else {
      await new Promise((resolve) => setTimeout(resolve, waitPeriod));
      totalWaitTime += waitPeriod;
    }
  }

  return await getAllSnowplowEvents();
}
