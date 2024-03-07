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

export enum ScheduledItemSource {
  MANUAL = 'MANUAL', // manually entered through the curation admin tool
  ML = 'ML', // created by ML
}

export enum ActionScreen {
  PROSPECTING = 'PROSPECTING',
  SCHEDULE = 'SCHEDULE',
  CORPUS = 'CORPUS',
}

export type ApprovedItemRequiredInput = {
  prospectId?: string;
  title: string;
  excerpt: string;
  authors: ApprovedItemAuthor[];
  status: CuratedStatus;
  language: string;
  publisher: string;
  imageUrl: string;
  topic: string;
  source: CorpusItemSource;
  isTimeSensitive: boolean;
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
  scheduledSource?: ScheduledItemSource;
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
  source: ScheduledItemSource;
};

// these values will need to match those listed in the source of truth doc:
// https://mozilla-hub.atlassian.net/wiki/spaces/PE/pages/390642851/Pocket+Shared+Data#Prospect-Types
export enum ProspectType {
  COUNTS = 'COUNTS',
  COUNTS_MODELED = 'COUNTS_MODELED',
  DISMISSED = 'DISMISSED',
  DOMAIN_ALLOWLIST = 'DOMAIN_ALLOWLIST',
  RECOMMENDED = 'RECOMMENDED',
  RSS_LOGISTIC = 'RSS_LOGISTIC',
  RSS_LOGISTIC_RECENT = 'RSS_LOGISTIC_RECENT',
  SLATE_SCHEDULER_V2 = 'SLATE_SCHEDULER_V2',
  SYNDICATED_NEW = 'SYNDICATED_NEW',
  SYNDICATED_RERUN = 'SYNDICATED_RERUN',
  TIMESPENT = 'TIMESPENT',
  TIMESPENT_MODELED = 'TIMESPENT_MODELED',
  TITLE_URL_MODELED = 'TITLE_URL_MODELED',
  TOP_SAVED = 'TOP_SAVED',
}

export enum ScheduledSurfaces {
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
}
