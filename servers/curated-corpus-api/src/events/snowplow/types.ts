import {
  ReviewedCorpusItemEventTypeString,
  ScheduledCorpusItemEventTypeString,
  SectionEventTypeString,
  SectionItemEventTypeString,
} from '../types';

export type SnowplowEventType =
  | 'reviewed_corpus_item_added'
  | 'reviewed_corpus_item_updated'
  | 'reviewed_corpus_item_removed'
  | 'reviewed_corpus_item_rejected'
  | 'scheduled_corpus_item_added'
  | 'scheduled_corpus_item_removed'
  | 'scheduled_corpus_item_rescheduled'
  | 'section_added'
  | 'section_updated'
  | 'section_removed'
  | 'section_item_added'
  | 'section_item_removed';

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

export const SectionSnowplowEventMap: Record<
  SectionEventTypeString,
  SnowplowEventType
> = {
  CREATE_SECTION: 'section_added',
  UPDATE_SECTION: 'section_updated',
  DELETE_SECTION: 'section_removed',
};

export const SectionItemSnowplowEventMap: Record<
  SectionItemEventTypeString,
  SnowplowEventType
> = {
  ADD_SECTION_ITEM: 'section_item_added',
  REMOVE_SECTION_ITEM: 'section_item_removed',
};
