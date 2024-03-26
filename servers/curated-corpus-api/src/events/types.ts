import {
  RejectedCuratedCorpusItem,
  ScheduledItem as ScheduledItemModel,
} from '.prisma/client';
import { ScheduledItem, CorpusItem, ApprovedItem } from '../database/types';
import { ScheduledCorpusItemStatus } from '../shared/types';
import { CorpusItemSource } from 'content-common';

export enum ReviewedCorpusItemEventType {
  ADD_ITEM = 'ADD_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  REJECT_ITEM = 'REJECT_ITEM',
}

export enum ScheduledCorpusItemEventType {
  ADD_SCHEDULE = 'ADD_SCHEDULE',
  REMOVE_SCHEDULE = 'REMOVE_SCHEDULE',
  RESCHEDULE = 'RESCHEDULE',
}

export type ReviewedCorpusItemEventTypeString =
  keyof typeof ReviewedCorpusItemEventType;
export type ScheduledCorpusItemEventTypeString =
  keyof typeof ScheduledCorpusItemEventType;

// Data common to all events
export type BaseEventData = {
  eventType:
    | ReviewedCorpusItemEventTypeString
    | ScheduledCorpusItemEventTypeString;
  timestamp: number; // epoch time (ms)
  source: string;
  version: string; // semver (e.g. 1.2.33)
};

// Data for approved items
// Stub type ready to be extended with non-database properties (for event tracking).
export type ApprovedCorpusItemPayload = ApprovedItem;

// Data for the events that are fired on changes to curated items
export type ReviewedCorpusItemPayload = {
  reviewedCorpusItem: ApprovedCorpusItemPayload | RejectedCuratedCorpusItem;
};

// Data for the events that are fired on updates to Scheduled Surface schedule
export type ScheduledCorpusItemPayload = {
  scheduledCorpusItem: ScheduledItem & {
    // the method by which this item was generated (MANUAL or ML, for a scheduled item)
    generated_by?: CorpusItemSource;
    // for some surfaces, curators will provide at least one reason and
    // optionally a comment when manually scheduling a corpus item.
    // the purpose here is for ML to know *why* items are manually scheduled
    // in an effort to improve their modeling.
    manualScheduleReasons?: string[];
    manualScheduleReasonsComment?: string;
    // will only be present when unscheduling an item from a limited set of
    // surfaces. these inform ML of why an item was unscheduled.
    reasons?: string[];
    reasonComment?: string;
    // the status of the scheduled_corpus_item, as decided by a curator.
    status?: ScheduledCorpusItemStatus;
  };
};

// Base interface for events sent to event bus
export interface BaseEventBusPayload {
  eventType: string;
}

// Data for events sent to event bus for Scheduled Surface schedule
export type ScheduledItemEventBusPayload = BaseEventBusPayload &
  Pick<ScheduledItemModel, 'createdBy' | 'scheduledSurfaceGuid'> &
  Pick<
    ApprovedItem,
    'topic' | 'isSyndicated' | keyof Omit<CorpusItem, 'id' | 'image' | 'target'>
  > & {
    scheduledItemExternalId: string; // externalId of ScheduledItem
    approvedItemExternalId: string; // externalId of ApprovedItem
    scheduledDate: string; // UTC Date string YYYY-MM-DD
    createdAt: string; // UTC timestamp string
    updatedAt: string; // UTC timestamp string
  };

export type ApprovedItemEventBusPayload = BaseEventBusPayload &
  Partial<
    Pick<
      ApprovedItem,
      | 'url'
      | 'title'
      | 'excerpt'
      | 'language'
      | 'publisher'
      | 'imageUrl'
      | 'topic'
      | 'isSyndicated'
      | 'createdBy'
      | 'authors'
    >
  > & {
    approvedItemExternalId: string; // externalId of ApprovedItem
    createdAt?: string; // UTC timestamp string
    updatedAt: string; // UTC timestamp string;
  };
