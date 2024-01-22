import fetch from 'node-fetch';
import config from '../../config';
import { CuratedCorpusItemUpdate } from '../../events/snowplow/schema';

export async function snowplowRequest(
  path: string,
  post = false
): Promise<any> {
  const response = await fetch(
    `${config.snowplow.httpProtocol}://${config.snowplow.endpoint}${path}`,
    {
      method: post ? 'POST' : 'GET',
    }
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

export function parseSnowplowData(data: string): { [key: string]: any } {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}

export function assertValidSnowplowObjectUpdateEvents(
  events,
  triggers: CuratedCorpusItemUpdate['trigger'][],
  object: CuratedCorpusItemUpdate['object']
) {
  const parsedEvents = events
    .map(parseSnowplowData)
    .map((parsedEvent) => parsedEvent.data);

  const actualEvents = triggers.map((trigger) => ({
      schema: config.snowplow.schemas.objectUpdate,
      data: { trigger, object },
  }));
  expect(parsedEvents.map(a => a.data.trigger).sort()).toEqual(actualEvents.map(a => a.data.trigger).sort());
  expect(parsedEvents.map(a => a.data.object).sort()).toEqual(actualEvents.map(a => a.data.object).sort());
  expect(parsedEvents.map(a => a.schema).sort()).toEqual(actualEvents.map(a => a.schema).sort());
}
