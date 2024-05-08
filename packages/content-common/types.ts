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
      ProspectType.RECOMMENDED,
      ProspectType.TOP_SAVED,
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.DISMISSED,
      ProspectType.SYNDICATED_RERUN,
      ProspectType.SYNDICATED_NEW,
      ProspectType.COUNTS_MODELED,
      ProspectType.TIMESPENT_MODELED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.RSS_LOGISTIC_RECENT,
      ProspectType.SLATE_SCHEDULER_V2,
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
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENGB,
  },
  {
    name: 'New Tab (fr-FR)',
    guid: 'NEW_TAB_FR_FR',
    ianaTimezone: 'Europe/Paris',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_FRFR,
  },
  {
    name: 'New Tab (it-IT)',
    guid: 'NEW_TAB_IT_IT',
    ianaTimezone: 'Europe/Rome',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ITIT,
  },
  {
    name: 'New Tab (es-ES)',
    guid: 'NEW_TAB_ES_ES',
    ianaTimezone: 'Europe/Madrid',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
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
    ],
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENINTL,
  },
  {
    name: 'Pocket Hits (en-US)',
    guid: 'POCKET_HITS_EN_US',
    ianaTimezone: 'America/New_York',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TOP_SAVED,
      ProspectType.TIMESPENT,
      ProspectType.DISMISSED,
      ProspectType.COUNTS_MODELED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.RSS_LOGISTIC,
      ProspectType.SYNDICATED_NEW,
      ProspectType.SYNDICATED_RERUN,
    ],
    accessGroup: MozillaAccessGroup.POCKET_HITS_CURATOR_ENUS,
  },
  {
    name: 'Pocket Hits (de-DE)',
    guid: 'POCKET_HITS_DE_DE',
    ianaTimezone: 'Europe/Berlin',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.TOP_SAVED,
      ProspectType.DOMAIN_ALLOWLIST,
      ProspectType.TITLE_URL_MODELED,
    ],
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
}

/* AP style formatting for title */
// String of stop words. When a lowercased word is included in this string, it will be in lowercase.
export const STOP_WORDS =
    'a an and at but by for in nor of on or so the to up yet';

// special chars separating words, used for splitting
export const SEPARATORS = /(\s+|[-‑–—,:;!?()“”"])/;

// get the stop word in STOP_WORDS str by splitting by whitespace
export const stop = STOP_WORDS.split(' ');

