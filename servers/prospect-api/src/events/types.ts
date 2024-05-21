import { ProspectReviewStatus} from 'content-common';

export type EventBridgeProspect = {
  // a GUID we generate prior to inserting into dynamo
  id: string;
  // the prospect ID supplied by ML
  prospectId: string;
  scheduledSurfaceGuid: string;
  topic?: string;
  prospectType: string;
  url: string;
  saveCount: number;
  rank: number;
  curated?: boolean;
  // unix timestamp
  createdAt?: number;
  domain?: string;
  excerpt?: string;
  imageUrl?: string;
  language?: string;
  publisher?: string;
  title?: string;
  isSyndicated?: boolean;
  isCollection?: boolean;
  // authors will be a comma separated string
  authors?: string;
  approvedCorpusItem?: { url: string };
  rejectedCorpusItem?: { url: string };
  prospectReviewStatus: ProspectReviewStatus;
  // The LDAP string of the curator who reviewed this prospect - for now, only dismissing prospect.
  reviewedBy?: string;
  // The Unix timestamp in seconds.
  reviewedAt?: number;
};

export enum EventBridgeEventType {
  PROSPECT_DISMISS = 'prospect-dismiss',
}

export type ProspectDismissEventBusPayload = {
  eventType: EventBridgeEventType;
  object_version: string;
  prospect: EventBridgeProspect;
};

// referenced from snowplow schema directly
export type SnowplowProspect = {
  object_version: 'new' | 'old';
  // the prospect ID supplied by ML
  prospect_id: string;
  url: string;
  title?: string;
  excerpt?: string;
  image_url?: string;
  language?: string;
  topic?: string;
  is_collection?: boolean;
  is_syndicated?: boolean;
  authors?: string[];
  publisher?: string;
  domain?: string;
  prospect_source: string;
  scheduled_surface_id: string;
  created_at: number;
  prospect_review_status: ProspectReviewStatus;
  // The Unix timestamp in seconds.
  reviewed_at?: number;
  // The LDAP string of the curator who reviewed this prospect - for now, only removing prospect.
  reviewed_by?: string;
  // optional removal reasons and comment provided by a curator - only when removing.
  status_reasons?: string[];
  status_reason_comment?: string;
};
