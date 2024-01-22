import EventEmitter from 'events';
import config from '../config';
import {
  BaseEventData,
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
} from './types';
import { getUnixTimestamp } from '../shared/utils';

export class CuratedCorpusEventEmitter extends EventEmitter {
  private static buildEvent<BaseEventPayload>(
    eventData: BaseEventPayload,
    eventType: ReviewedCorpusItemEventType | ScheduledCorpusItemEventType
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
    event: ReviewedCorpusItemEventType | ScheduledCorpusItemEventType,
    data: BaseEventPayload
  ): void {
    this.emit(event, CuratedCorpusEventEmitter.buildEvent(data, event));
  }
}
