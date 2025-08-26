import { CuratedCorpusEventEmitter } from './curatedCorpusEventEmitter';
import { tracker } from './snowplow/tracker';
import config from '../config';
import { ReviewedItemSnowplowHandler } from './snowplow/ReviewedItemSnowplowHandler';
import { ScheduledItemSnowplowHandler } from './snowplow/ScheduledItemSnowplowHandler';

export type CuratedCorpusEventHandlerFn = (
  emitter: CuratedCorpusEventEmitter,
) => void;

/**
 *   Listen to and track events on Reviewed Corpus Items
 *
 * @param emitter
 */
export function corpusItemSnowplowEventHandler(
  emitter: CuratedCorpusEventEmitter,
): void {
  const snowplowEventsToListen = Object.values(
    config.snowplow.corpusItemEvents,
  ) as string[];
  new ReviewedItemSnowplowHandler(emitter, tracker, snowplowEventsToListen);
}

/**
 * @param emitter
 */
export function corpusScheduleSnowplowEventHandler(
  emitter: CuratedCorpusEventEmitter,
): void {
  const snowplowEventsToListen = Object.values(
    config.snowplow.corpusScheduleEvents,
  ) as string[];
  new ScheduledItemSnowplowHandler(emitter, tracker, snowplowEventsToListen);
}
