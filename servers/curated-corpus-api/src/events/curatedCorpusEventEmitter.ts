import EventEmitter from 'events';
import { PubSub } from '@google-cloud/pubsub';
import config from '../config';
import {
  BaseEventData,
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
  SectionEventType,
  SectionItemEventType,
} from './types';
import { getUnixTimestamp } from '../shared/utils';
import { serverLogger } from '@pocket-tools/ts-logger';

const gcp_credentials = config.gcp.serviceAccountKey
  ? JSON.parse(config.gcp.serviceAccountKey)
  : undefined;

const pubsub = new PubSub({
  projectId: config.gcp.projectId,
  ...(gcp_credentials && { credentials: gcp_credentials }),
});
const topic = pubsub.topic(config.gcp.topicName);

export class CuratedCorpusEventEmitter extends EventEmitter {
  private static buildEvent<BaseEventPayload>(
    eventData: BaseEventPayload,
    eventType: ReviewedCorpusItemEventType | ScheduledCorpusItemEventType | SectionEventType | SectionItemEventType
  ): BaseEventPayload & BaseEventData {
    return {
      ...eventData,
      eventType: eventType,
      source: config.events.source,
      version: config.events.version,
      timestamp: getUnixTimestamp(new Date()),
    };
  }

  emitEvent<BaseEventPayload>(
    event: ReviewedCorpusItemEventType | ScheduledCorpusItemEventType | SectionEventType | SectionItemEventType,
    data: BaseEventPayload
  ): void {
    const builtEvent = CuratedCorpusEventEmitter.buildEvent(data, event);
    serverLogger.info('Emitting event', {
      eventType: event,
      body: JSON.stringify(builtEvent),
    });

    // TODO: buffer/batch events?
    topic.publishMessage({ json: builtEvent }).catch((err) => {
      // gRPC has retry logic for transient errors
      serverLogger.error('Failed to publish event to Pub/Sub', {
        error: err,
      });
    });

    this.emit(event, builtEvent);
  }
}
