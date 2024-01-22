import {
  ReviewedCorpusItemEventTypeString,
  ScheduledCorpusItemEventTypeString,
} from '../types';

export type SnowplowEventType =
  | 'reviewed_corpus_item_added'
  | 'reviewed_corpus_item_updated'
  | 'reviewed_corpus_item_removed'
  | 'reviewed_corpus_item_rejected'
  | 'scheduled_corpus_item_added'
  | 'scheduled_corpus_item_removed'
  | 'scheduled_corpus_item_rescheduled';

export const ReviewedItemSnowplowEventMap: Record<
  ReviewedCorpusItemEventTypeString,
  SnowplowEventType
> = {
  ADD_ITEM: 'reviewed_corpus_item_added',
  UPDATE_ITEM: 'reviewed_corpus_item_updated',
  REMOVE_ITEM: 'reviewed_corpus_item_removed',
  REJECT_ITEM: 'reviewed_corpus_item_rejected',
};

export const ScheduledItemSnowplowEventMap: Record<
  ScheduledCorpusItemEventTypeString,
  SnowplowEventType
> = {
  ADD_SCHEDULE: 'scheduled_corpus_item_added',
  REMOVE_SCHEDULE: 'scheduled_corpus_item_removed',
  RESCHEDULE: 'scheduled_corpus_item_rescheduled',
};
