export enum RejectionReason {
  PAYWALL = 'PAYWALL',
  POLITICAL_OPINION = 'POLITICAL_OPINION',
  OFFENSIVE_MATERIAL = 'OFFENSIVE_MATERIAL',
  TIME_SENSITIVE = 'TIME_SENSITIVE',
  MISINFORMATION = 'MISINFORMATION',
  PUBLISHER_QUALITY = 'PUBLISHER_QUALITY',
  PUBLISHER_REQUEST = 'PUBLISHER_REQUEST',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

export enum ManualScheduleReason {
  EVERGREEN = 'EVERGREEN',
  FORMAT_DIVERSITY = 'FORMAT_DIVERSITY',
  TIME_SENSITIVE_EXPLAINER = 'TIME_SENSITIVE_EXPLAINER',
  TIME_SENSITIVE_NEWS = 'TIME_SENSITIVE_NEWS',
  PUBLISHER_DIVERSITY = 'PUBLISHER_DIVERSITY',
  TRENDING = 'TRENDING',
  TOPIC_DIVERSITY = 'TOPIC_DIVERSITY',
  UNDER_THE_RADAR = 'UNDER_THE_RADAR',
  OTHER = 'OTHER',
}

// End Pocket shared data

// snowplow-dictated enum for the status of a scheduled corpus item
export enum ScheduledCorpusItemStatus {
  ADDED = 'added',
  REMOVED = 'removed',
  RESCHEDULED = 'rescheduled',
}

// Computed status for the Section, based on startDate, endDate, and disabled.
export enum SectionStatus {
  DISABLED = 'DISABLED',
  SCHEDULED = 'SCHEDULED',
  EXPIRED = 'EXPIRED',
  LIVE = 'LIVE',
}

export type ApprovedItemS3ImageUrl = {
  url: string;
};

export type OpenGraphFields = {
  description: string;
};

export const ACCESS_DENIED_ERROR =
  'You do not have access to perform this action.';
