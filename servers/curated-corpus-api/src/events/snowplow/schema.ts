// Helper types and enums used in the schema
import { ScheduledCorpusItemStatus } from '../../shared/types';
import {
  ActionScreen,
  CorpusItemSource,
  ScheduledItemSource,
} from 'content-common';

export type RejectionReason = { reason: string };

export enum ObjectVersion {
  NEW = 'new',
  OLD = 'old',
}

export enum CorpusReviewStatus {
  RECOMMENDATION = 'recommendation',
  CORPUS = 'corpus',
  REJECTED = 'rejected',
}

// Events
export type CuratedCorpusItemUpdate = {
  trigger:
    | 'reviewed_corpus_item_added' // Item is added to the curated corpus
    | 'reviewed_corpus_item_updated' // Item is updated in the corpus
    | 'reviewed_corpus_item_removed' // Item is removed from the approved corpus
    | 'reviewed_corpus_item_rejected' // Item is added to the rejected corpus
    | 'scheduled_corpus_item_added' // Item is added to the scheduled surface schedule
    | 'scheduled_corpus_item_removed'; // Item is removed from the scheduled surface schedule
  object: 'reviewed_corpus_item' | 'scheduled_corpus_item';
};

/**
 * Entity to describe an item that has been reviewed for the Pocket
 * recommendation corpus. Expected (new and old) on all object_update
 * events where object = reviewed_corpus_item.
 *
 * Note that many of the properties below are optional because a reviewed
 * corpus item may mean rejected, in which case many properties may be absent.
 */
export type ReviewedCorpusItem = {
  /**
   * Indication of whether the version of the entity is before or after
   * the modifications were made.
   */
  object_version: ObjectVersion;
  /**
   * A guid that identifies the reviewed corpus item’s approved_item_id
   * in backend systems, sometimes referred to as an approved corpus item’s
   * external_id.
   */
  approved_corpus_item_external_id?: string;
  /**
   * A guid that identifies the reviewed corpus item’s rejected_item_id
   * in backend systems, sometimes referred to as a rejected corpus item’s
   * external_id.
   */
  rejected_corpus_item_external_id?: string;
  /**
   * The identifier for the curation prospect, used to join with the dataset
   * that describes the prospect.
   */
  prospect_id?: string;
  /**
   * The URL of the reviewed corpus item.
   */
  url: string;
  /**
   * Indicates the backend source for an approved corpus item.
   */
  loaded_from?: CorpusItemSource;
  /**
   * The decision by the curator on the item’s validity for the curated corpus.
   */
  corpus_review_status: CorpusReviewStatus;
  /**
   * The list of reasons a curator rejected the item (if the item has
   * a "rejected" status).
   */
  rejection_reasons?: string[];
  /**
   * The title of the reviewed corpus item.
   */
  title?: string;
  /**
   * The excerpt for the reviewed corpus item.
   */
  excerpt?: string;
  /**
   * The publisher for the reviewed corpus item.
   */
  publisher?: string;
  /**
   * The list of authors for the reviewed corpus item.
   */
  authors?: string[];
  /**
   * The url of the main image of the reviewed corpus item.
   */
  image_url?: string;
  /**
   * The language of the reviewed corpus item.
   */
  language?: string;
  /**
   * The topic of the reviewed corpus item.
   */
  topic?: string;
  /**
   * Indicates whether the reviewed corpus item is a collection.
   */
  is_collection?: boolean;
  /**
   * Indicates whether the reviewed corpus item is a syndicated article.
   */
  is_syndicated?: boolean;
  /**
   * Indicates whether the reviewed corpus item is only relevant
   * for a short period of time (e.g. news).
   */
  is_time_sensitive?: boolean;
  /**
   * The UTC unix timestamp (in seconds) for when the reviewed corpus item
   * was created.
   */
  created_at?: number;
  /**
   * The curator who created the reviewed corpus item.
   */
  created_by?: string;
  /**
   * The UTC unix timestamp (in seconds) for when the reviewed corpus item
   * was last updated.
   */
  updated_at?: number;
  /**
   * The curator who most recently updated the reviewed corpus item.
   */
  updated_by?: string;
  /**
   * Indicates where in the Curation Tools UI the action took place. Null if the action was performed by a backend ML process.
   */
  action_screen?: ActionScreen;
};

/**
 * A scheduled run in the scheduled surface of a reviewed corpus item.
 */
export type ScheduledCorpusItem = {
  /**
   * Indication of whether the version of the entity is before or after
   * the modifications were made.
   */
  object_version: ObjectVersion;
  /**
   * A guid that identifies the scheduled surface schedule, sometimes referred to
   * as the scheduled surface schedule's external_id.
   */
  scheduled_corpus_item_external_id: string;
  /**
   * The UTC Unix timestamp (in seconds) for when the reviewed corpus item
   * is scheduled to run. Items are scheduled for a particular day, not exact
   * time, so this is a Unix timestamp with the actual date
   * and a time component of 00:00.
   */
  scheduled_at: number;
  /**
   * The URL of the approved corpus item.
   * This will help link the scheduled item back to the approved curated item.
   */
  url: string;
  /**
   * A guid that identifies the reviewed corpus item’s approved_item_id
   * in backend systems, sometimes referred to as an approved corpus item’s
   * external_id.
   *
   * This will help link the scheduled item back to the approved curated item.
   */
  approved_corpus_item_external_id: string;
  /**
   * A guid that identifies the scheduled surface, e.g. 'NEW_TAB_EN_US'.
   */
  scheduled_surface_id: string;
  /**
   * The name of the scheduled surface.
   */
  scheduled_surface_name?: string;
  /**
   * The iana.org timezone of the scheduled surface.
   */
  scheduled_surface_iana_timezone?: string;
  /**
   * The UTC unix timestamp (in seconds) for when the scheduled surface schedule
   * was created.
   */
  created_at?: number;
  /**
   * The curator who created the scheduled surface schedule.
   */
  created_by?: string;
  /**
   * The UTC unix timestamp (in seconds) for when the scheduled surface schedule
   * was last updated.
   */
  updated_at?: number;
  /**
   * The curator who most recently updated the scheduled surface feed schedule.
   */
  updated_by?: string;
  /**
   * The list of reasons why the curator set the current status for the scheduled_corpus_item.
   */
  status_reasons?: string[];
  /**
   * An optional text field for the curator to provide more information about a change in status.
   */
  status_reason_comment?: string;
  /**
   * The method by which this item was generated. Possible values include ML and MANUAL.
   */
  generated_by?: ScheduledItemSource;
  /**
   * A guid that identifies the original schedule on which the curator action (removed or rescheduled) took place.
   */
  original_scheduled_corpus_item_external_id?: string;
  /**
   * The status of the scheduled_corpus_item, as decided by a curator.
   */
  status?: ScheduledCorpusItemStatus;
  /**
   * Indicates where in the Curation Tools UI the action took place. Null if the action was performed by a backend ML process.
   */
  action_screen?: ActionScreen;
};
