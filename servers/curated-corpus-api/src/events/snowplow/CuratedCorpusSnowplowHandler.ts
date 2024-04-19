import * as Sentry from '@sentry/node';
import { Tracker } from '@snowplow/node-tracker';
import { PayloadBuilder, SelfDescribingJson } from '@snowplow/tracker-core';

import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { serverLogger } from '@pocket-tools/ts-logger';

export class CuratedCorpusSnowplowHandler {
  constructor(
    protected emitter: CuratedCorpusEventEmitter,
    protected tracker: Tracker,
    events: string[],
  ) {
    // register handler for item events
    events.forEach((event) => emitter.on(event, (data) => this.process(data)));
  }

  async process(data: any): Promise<void> {
    throw new Error('This method needs to be implemented in a child class');
  }

  /**
   * Track snowplow event
   * @param event
   * @param context
   * @protected
   */
  protected async track(
    event: PayloadBuilder,
    context: SelfDescribingJson[],
  ): Promise<void> {
    try {
      await this.tracker.track(event, context);
    } catch (ex) {
      const message = `Failed to send event to snowplow.\n event: ${event}\n context: ${context}`;
      serverLogger.error('sendEvent: Failed to send event to snowplow', {
        event: event,
        context: context,
      });
      Sentry.addBreadcrumb({ message });
      Sentry.captureException(ex);
    }
  }
}
