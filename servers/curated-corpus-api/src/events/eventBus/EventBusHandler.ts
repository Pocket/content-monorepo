import { BaseEventData, BaseEventBusPayload } from '../types';
import { EventHandlerCallbackMap } from './types';
import EventEmitter from 'events';
import config from '../../config';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
} from '@aws-sdk/client-eventbridge';
import { eventBusConfig } from './EventBusConfig';
import * as Sentry from '@sentry/node';
import { serverLogger } from '@pocket-tools/ts-logger';

/**
 * This class listens to events emitted by the application. When the
 * class is instantiated, iterates over entries in an internal mapping
 * of event name to handler function, and registers the handler function
 * as a listener on the given event name. The payload returned by the
 * handler function is asynchronously sent to the Event Bus described
 * in the application config file.
 *
 * To handle a new event, you need not update this class directly. Instead,
 * add a payload builder function to EventBusConfig.ts and update the
 * mapping of event name to payload builder in that file.
 *
 * Error Handling:
 *  Any error that occurs when either building the payload or sending the
 *  event to EventBridge will be sent to Sentry and logged in Cloudwatch.
 *  No errors are thrown directly.
 *
 **/
export class EventBusHandler {
  // Mapping of internal application events to listeners in this class
  // Update this in constructor whenever new listener methods are added
  // The key is optional since not all possible events delineated in the
  // app logic are consumed
  private eventHandlerCallbackMap: {
    [key in BaseEventData['eventType']]?: (data: any) => BaseEventBusPayload;
  };

  private client: EventBridgeClient;

  /**
   * When an instance of EventBusHandler is constructed, register listeners
   * on the passed `emitter` object according to the specification in
   * `eventHandlerMap`
   * @param emitter the emitter which sends events to listen to
   * @param eventHandlerMap optional map of event name to payload builder
   * functions. If not specified, will default to eventBusConfig
   */
  constructor(
    protected emitter: EventEmitter,
    eventHandlerMap?: EventHandlerCallbackMap,
  ) {
    this.client = new EventBridgeClient({
      region: config.aws.region,
    });
    // Update this mapping with the new handler function and event whenever
    // new events/handler methods are added
    this.eventHandlerCallbackMap = eventHandlerMap ?? eventBusConfig;
    // Register handler method for each handled event
    Object.entries(this.eventHandlerCallbackMap).forEach(([event, method]) => {
      emitter.on(event, (data) => {
        try {
          const eventPayload = method(data);
          this.sendEvent(eventPayload);
        } catch (error) {
          // In the unlikely event that the payload generator throws an error,
          // log to Sentry and Cloudwatch but don't halt program
          Sentry.captureException(error);
          serverLogger.error(
            'EventBusHandler: Failed to send event to event bus',
            {
              error,
            },
          );
        }
      });
    });
  }

  /**
   * Send event to Event Bus, pulling the event bus and the event source
   * from the config.
   * Will not throw errors if event fails; instead, log exception to Sentry
   * and add to Cloudwatch logs.
   * @param eventPayload the payload to send to event bus
   */
  async sendEvent(eventPayload: BaseEventBusPayload) {
    const putEventCommand = new PutEventsCommand({
      Entries: [
        {
          EventBusName: config.aws.eventBus.name,
          Detail: JSON.stringify(eventPayload),
          Source: config.eventBridge.source,
          DetailType: eventPayload.eventType,
        },
      ],
    });
    const output: PutEventsCommandOutput = await this.client.send(
      putEventCommand,
    );
    if (output.FailedEntryCount) {
      const failedEventError = new Error(
        `Failed to send event '${
          eventPayload.eventType
        }' to event bus. Event Body:\n ${JSON.stringify(eventPayload)}`,
      );
      // Don't halt program, but capture the failure in Sentry and Cloudwatch
      Sentry.captureException(failedEventError);
      serverLogger.error('sendEvent: Failed to send event to event bus', {
        eventType: eventPayload.eventType,
        payload: JSON.stringify(eventPayload),
      });
    }
  }
}
