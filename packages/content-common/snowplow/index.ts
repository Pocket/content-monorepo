import {
  gotEmitter,
  HttpMethod,
  HttpProtocol,
  tracker as snowPlowTracker,
  Emitter,
  Tracker,
} from '@snowplow/node-tracker';
import { Response, RequestError } from 'got';
import config from './config';

let emitter: Emitter;
let tracker: Tracker;

/**
 * lazy instantiation of a snowplow emitter
 *
 * @returns Emitter
 */
export function getEmitter(errorHandler?: (error: object) => void): Emitter {
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
        if (error && errorHandler) {
          errorHandler(error);
        }
      },
    );
  }

  return emitter;
}

/**
 * lazy instantiation of a snowplow tracker
 * @param emitter Emitter - a snowplow emitter
 * @param appId Identifies the app to Snowplow that's sending the events
 * @returns Tracker
 */
export const getTracker = (emitter: Emitter, appId: string): Tracker => {
  if (!tracker) {
    tracker = snowPlowTracker(emitter, config.snowplow.namespace, appId, true);
  }

  return tracker;
};
