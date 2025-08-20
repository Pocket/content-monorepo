export type ApprovedItemAuthor = {
  name: string;
  sortOrder: number;
};

export enum CorpusItemSource {
  PROSPECT = 'PROSPECT', //  originated as a prospect in the curation admin tool
  MANUAL = 'MANUAL', // manually entered through the curation admin tool
  BACKFILL = 'BACKFILL', // imported from the legacy database
  ML = 'ML', // created by ML
}

export enum CorpusLanguage {
  EN = 'EN',
  DE = 'DE',
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
}

export enum Topics {
  BUSINESS = 'BUSINESS',
  CAREER = 'CAREER',
  CORONAVIRUS = 'CORONAVIRUS',
  EDUCATION = 'EDUCATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  FOOD = 'FOOD',
  GAMING = 'GAMING',
  HEALTH_FITNESS = 'HEALTH_FITNESS',
  HOME = 'HOME',
  PARENTING = 'PARENTING',
  PERSONAL_FINANCE = 'PERSONAL_FINANCE',
  POLITICS = 'POLITICS',
  SCIENCE = 'SCIENCE',
  SELF_IMPROVEMENT = 'SELF_IMPROVEMENT',
  SPORTS = 'SPORTS',
  TECHNOLOGY = 'TECHNOLOGY',
  TRAVEL = 'TRAVEL',
}

export enum CuratedStatus {
  RECOMMENDATION = 'RECOMMENDATION',
  CORPUS = 'CORPUS',
}

export enum ActivitySource {
  MANUAL = 'MANUAL', // manually entered through the curation admin tool
  ML = 'ML', // created by ML
}

export enum ActionScreen {
  PROSPECTING = 'PROSPECTING',
  SCHEDULE = 'SCHEDULE',
  CORPUS = 'CORPUS',
  SECTIONS = 'SECTIONS',
}

export enum SectionItemRemovalReason {
  ARTICLE_QUALITY = 'ARTICLE_QUALITY',
  CONTROVERSIAL = 'CONTROVERSIAL',
  DATED = 'DATED',
  HED_DEK_QUALITY = 'HED_DEK_QUALITY',
  IMAGE_QUALITY = 'IMAGE_QUALITY',
  NO_IMAGE = 'NO_IMAGE',
  OFF_TOPIC = 'OFF_TOPIC',
  ONE_SIDED = 'ONE_SIDED',
  PAYWALL = 'PAYWALL',
  PUBLISHER_QUALITY = 'PUBLISHER_QUALITY',
  SET_DIVERSITY = 'SET_DIVERSITY',
  OTHER = 'OTHER',
  ML = 'ML'
}

export type IABMetadata = {
  taxonomy: string;
  categories: string[];
}

export type ApprovedItemRequiredInput = {
  prospectId?: string;
  title: string;
  excerpt: string;
  authors: ApprovedItemAuthor[];
  status: CuratedStatus;
  language: CorpusLanguage;
  publisher: string;
  imageUrl: string;
  topic: string;
  source: CorpusItemSource;
  isTimeSensitive: boolean;
};

export type CreateOrUpdateSectionApiInput = {
  externalId: string;
  title: string;
  scheduledSurfaceGuid: string;
  iab?: IABMetadata;
  sort?: number;
  createSource: ActivitySource;
  active: boolean;
};

export type CreateCustomSectionApiInput = {
  title: string;
  description: string;
  heroTitle?: string;
  heroDescription?: string;
  startDate: string;
  endDate?: string;
  scheduledSurfaceGuid: string;
  iab?: IABMetadata,
  sort?: number;
  createSource: ActivitySource;
  active: boolean;
  disabled: boolean;
};

export type UpdateCustomSectionApiInput = {
  externalId: string;
  title?: string;
  description?: string;
  heroTitle?: string;
  heroDescription?: string;
  startDate?: string;
  endDate?: string;
  scheduledSurfaceGuid?: string;
  iab?: IABMetadata;
  sort?: number | null;
  createSource: ActivitySource;
  active?: boolean;
  disabled?: boolean;
};

export type DisableEnableSectionApiInput = {
  externalId: string;
  disabled: boolean;
};

export type CreateSectionItemApiInput = {
  sectionExternalId: string;
  approvedItemExternalId: string;
  rank?: number;
};

export type RemoveSectionItemApiInput = {
  externalId: string;
  deactivateReasons: SectionItemRemovalReason[];
  deactivateSource?: ActivitySource;
};

// maps to the CreateApprovedCorpusItemInput type in corpus API admin schema
export type CreateApprovedCorpusItemApiInput = ApprovedItemRequiredInput & {
  // These required properties are set once only at creation time
  // and never changed, so they're not part of the shared input type above.
  url: string;
  isCollection: boolean;
  isSyndicated: boolean;
  // These are optional properties for approving AND scheduling the item
  // on a Scheduled Surface at the same time.
  // Note that all three must be present to schedule the item.
  scheduledDate?: string;
  scheduledSurfaceGuid?: string;
  scheduledSource?: ActivitySource;
  // This is an optional property that may or may not be present at the time
  // a corpus item is saved in the datastore
  datePublished?: string;
  // Optional value specifying which admin screen the action originated from.
  actionScreen?: ActionScreen; // non-db, analytics only
};

export type CreateScheduledItemInput = {
  approvedItemExternalId: string;
  scheduledSurfaceGuid: string;
  scheduledDate: string;
  source: ActivitySource;
};

// these values will need to match those listed in the source of truth doc:
// https://mozilla-hub.atlassian.net/wiki/spaces/PE/pages/390642851/Pocket+Shared+Data#Prospect-Types
export enum ProspectType {
  COUNTS = 'COUNTS',
  DISMISSED = 'DISMISSED',
  DOMAIN_ALLOWLIST = 'DOMAIN_ALLOWLIST',
  PUBLISHER_SUBMITTED = 'PUBLISHER_SUBMITTED',
  RECOMMENDED = 'RECOMMENDED',
  RSS_LOGISTIC = 'RSS_LOGISTIC',
  RSS_LOGISTIC_RECENT = 'RSS_LOGISTIC_RECENT',
  SLATE_SCHEDULER_V2 = 'SLATE_SCHEDULER_V2',
  TIMESPENT = 'TIMESPENT',
  TITLE_URL_MODELED = 'TITLE_URL_MODELED',
  TOP_SAVED = 'TOP_SAVED',
  QA_ENTERTAINMENT = 'QA_ENTERTAINMENT',
  QA_SPORTS = 'QA_SPORTS',
  QA_MUSIC = 'QA_MUSIC',
  QA_MOVIES = 'QA_MOVIES',
  QA_BOOKS = 'QA_BOOKS',
  QA_TELEVISION = 'QA_TELEVISION',
  QA_CELEBRITY = 'QA_CELEBRITY',
  QA_MLB = 'QA_MLB',
  QA_NBA = 'QA_NBA',
  QA_NFL = 'QA_NFL',
  QA_NHL = 'QA_NHL',
  QA_SOCCER = 'QA_SOCCER', // placeholder for now
}

export enum ProspectReviewStatus {
  Created = 'created',
  Recommendation = 'recommendation',
  Corpus = 'corpus',
  Rejected = 'rejected',
  Dismissed = 'dismissed',
}

// used in prospect translation lambda
export type ProspectFeatures = {
  data_source: string;
  rank: number;
  save_count: number;
  predicted_topic: string;
};

// used in prospect translation lambda
export type ProspectRunDetails = {
  candidate_set_id: string;
  // unix timestamp
  expires_at: number;
  flow: string;
  run_id: string;
};

// referenced from snowplow schema directly (used by prospect-api, prospect translation lambda)
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
  // The Unix timestamp in seconds.
  created_at: number;
  prospect_review_status: ProspectReviewStatus;
  // The Unix timestamp in milliseconds.
  reviewed_at?: number;
  // The LDAP string of the curator who reviewed this prospect - for now, only removing prospect.
  reviewed_by?: string;
  // optional removal reasons and comment provided by a curator - only when removing.
  status_reasons?: string[];
  status_reason_comment?: string;
  features?: ProspectFeatures;
  run_details?: ProspectRunDetails;
};

export enum ScheduledSurfacesEnum {
  NEW_TAB_EN_US = 'NEW_TAB_EN_US',
  NEW_TAB_DE_DE = 'NEW_TAB_DE_DE',
  NEW_TAB_EN_GB = 'NEW_TAB_EN_GB',
  NEW_TAB_FR_FR = 'NEW_TAB_FR_FR',
  NEW_TAB_IT_IT = 'NEW_TAB_IT_IT',
  NEW_TAB_ES_ES = 'NEW_TAB_ES_ES',
  NEW_TAB_EN_INT = 'NEW_TAB_EN_INT',
  POCKET_HITS_EN_US = 'POCKET_HITS_EN_US',
  POCKET_HITS_DE_DE = 'POCKET_HITS_DE_DE',
  SANDBOX = 'SANDBOX',
}

export enum MozillaAccessGroup {
  READONLY = 'team_pocket', // Read only access to all curation tools
  COLLECTION_CURATOR_FULL = 'mozilliansorg_pocket_collection_curator_full', // Access to full collection tool
  SCHEDULED_SURFACE_CURATOR_FULL = 'mozilliansorg_pocket_scheduled_surface_curator_full', // Access to full corpus tool, implies they have access to all scheduled surfaces.
  NEW_TAB_CURATOR_ENUS = 'mozilliansorg_pocket_new_tab_curator_enus', // Access to en-US new tab in the corpus tool.
  NEW_TAB_CURATOR_DEDE = 'mozilliansorg_pocket_new_tab_curator_dede', // Access to de-DE new tab in corpus tool.
  NEW_TAB_CURATOR_ENGB = 'mozilliansorg_pocket_new_tab_curator_engb', // Access to en-GB new tab in corpus tool.
  NEW_TAB_CURATOR_FRFR = 'mozilliansorg_pocket_new_tab_curator_frfr', // Access to fr-FR new tab in corpus tool.
  NEW_TAB_CURATOR_ITIT = 'mozilliansorg_pocket_new_tab_curator_itit', // Access to it-IT new tab in corpus tool.
  NEW_TAB_CURATOR_ESES = 'mozilliansorg_pocket_new_tab_curator_eses', // Access to es-ES new tab in corpus tool.
  NEW_TAB_CURATOR_ENINTL = 'mozilliansorg_pocket_new_tab_curator_enintl', // Access to en-INTL new tab in corpus tool.
  POCKET_HITS_CURATOR_ENUS = 'mozilliansorg_pocket_pocket_hits_curator_enus', // Access to en us Pocket Hits in the corpus tool.
  POCKET_HITS_CURATOR_DEDE = 'mozilliansorg_pocket_pocket_hits_curator_dede', // Access to de de Pocket Hits in the corpus tool.
  CURATOR_SANDBOX = 'mozilliansorg_pocket_curator_sandbox', // Access to sandbox test surface in the corpus tool.
}

export type ScheduledSurface = {
  name: string;
  guid: string;
  ianaTimezone: string;
  prospectTypes: ProspectType[];
  accessGroup: string;
};

export const ScheduledSurfaces: ScheduledSurface[] = [
  {
    name: 'New Tab (en-US)',
    guid: 'NEW_TAB_EN_US',
    ianaTimezone: 'America/New_York',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.TOP_SAVED,
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.DISMISSED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.RSS_LOGISTIC_RECENT,
      ProspectType.SLATE_SCHEDULER_V2,
      ProspectType.PUBLISHER_SUBMITTED,
      ProspectType.QA_MUSIC,
      ProspectType.QA_MOVIES,
      ProspectType.QA_BOOKS,
      ProspectType.QA_TELEVISION,
      ProspectType.QA_CELEBRITY,
      ProspectType.QA_MLB,
      ProspectType.QA_NBA,
      ProspectType.QA_NFL,
      ProspectType.QA_NHL,
      ProspectType.QA_SOCCER,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENUS,
  },
  {
    name: 'New Tab (de-DE)',
    guid: 'NEW_TAB_DE_DE',
    ianaTimezone: 'Europe/Berlin',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.DISMISSED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.SLATE_SCHEDULER_V2,
      ProspectType.PUBLISHER_SUBMITTED,
      ProspectType.QA_ENTERTAINMENT,
      ProspectType.QA_SPORTS,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
  },
  {
    name: 'New Tab (en-GB)',
    guid: 'NEW_TAB_EN_GB',
    ianaTimezone: 'Europe/London',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.RECOMMENDED,
      ProspectType.DISMISSED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.PUBLISHER_SUBMITTED,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENGB,
  },
  {
    name: 'New Tab (fr-FR)',
    guid: 'NEW_TAB_FR_FR',
    ianaTimezone: 'Europe/Paris',
    prospectTypes: [
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.RSS_LOGISTIC,
      ProspectType.PUBLISHER_SUBMITTED,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_FRFR,
  },
  {
    name: 'New Tab (it-IT)',
    guid: 'NEW_TAB_IT_IT',
    ianaTimezone: 'Europe/Rome',
    prospectTypes: [
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.RSS_LOGISTIC,
      ProspectType.PUBLISHER_SUBMITTED,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ITIT,
  },
  {
    name: 'New Tab (es-ES)',
    guid: 'NEW_TAB_ES_ES',
    ianaTimezone: 'Europe/Madrid',
    prospectTypes: [
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.RSS_LOGISTIC,
      ProspectType.PUBLISHER_SUBMITTED,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ESES,
  },
  {
    name: 'New Tab (en-INTL)',
    guid: 'NEW_TAB_EN_INTL',
    ianaTimezone: 'Asia/Kolkata',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.RECOMMENDED,
      ProspectType.DISMISSED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.PUBLISHER_SUBMITTED,
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENINTL,
  },
  {
    name: 'Pocket Hits (en-US)',
    guid: 'POCKET_HITS_EN_US',
    ianaTimezone: 'America/New_York',
    prospectTypes: [ProspectType.TOP_SAVED],
    accessGroup: MozillaAccessGroup.POCKET_HITS_CURATOR_ENUS,
  },
  {
    name: 'Pocket Hits (de-DE)',
    guid: 'POCKET_HITS_DE_DE',
    ianaTimezone: 'Europe/Berlin',
    prospectTypes: [ProspectType.TOP_SAVED],
    accessGroup: MozillaAccessGroup.POCKET_HITS_CURATOR_DEDE,
  },

  {
    name: 'Sandbox',
    guid: 'SANDBOX',
    ianaTimezone: 'America/New_York',
    prospectTypes: [],
    accessGroup: MozillaAccessGroup.CURATOR_SANDBOX,
  },
];

// prospect-api
export interface UrlMetadata {
  url: string;
  imageUrl?: string;
  publisher?: string;
  datePublished?: string;
  domain?: string;
  title?: string;
  excerpt?: string;
  language?: string;
  isSyndicated?: boolean;
  isCollection?: boolean;
  // authors is a comma separated string
  authors?: string;
}

export enum CuratedCorpusApiErrorCodes {
  ALREADY_SCHEDULED = 'ALREADY_SCHEDULED',
  ALREADY_REVIEWED = 'ALREADY_REVIEWED',
}

/* AP style formatting for title */
// String of stop words. When a lowercased word is included in this string, it will be in lowercase.
export const STOP_WORDS =
  'a an and at but by for in nor of on or the to up yet';

// Matches a colon (:) and 0+ white spaces following after
// Matches 1+ white spaces
// Matches special chars (i.e. hyphens, quotes, etc)
export const SEPARATORS = /(:\s*|\s+|[-‑–—,:;!?()“”'‘"])/; // Include curly quotes as separators

export const stop = STOP_WORDS.split(' ');
