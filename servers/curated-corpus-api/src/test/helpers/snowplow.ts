import config from '../../config';
import { CuratedCorpusItemUpdate } from '../../events/snowplow/schema';
import { parseSnowplowData } from 'content-common/snowplow/test-helpers';

export function assertValidSnowplowObjectUpdateEvents(
  events,
  triggers: CuratedCorpusItemUpdate['trigger'][],
  object: CuratedCorpusItemUpdate['object'],
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
