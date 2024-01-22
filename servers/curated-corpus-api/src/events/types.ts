import {
  RejectedCuratedCorpusItem,
  ScheduledItem as ScheduledItemModel,
} from '@prisma/client';
import { ScheduledItem, CorpusItem, ApprovedItem } from '../database/types';

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

// Data for the events that are fired on changes to curated items
export type ReviewedCorpusItemPayload = {
  reviewedCorpusItem: ApprovedItem | RejectedCuratedCorpusItem;
};

// Data for the events that are fired on updates to Scheduled Surface schedule
export type ScheduledCorpusItemPayload = {
  scheduledCorpusItem: ScheduledItem;
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
