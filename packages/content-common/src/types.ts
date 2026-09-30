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
  PL = 'PL',
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

/**
 * The username identifier for ML Lambda service accounts.
 * Used in JWT userId field and for identifying ML-initiated actions.
 */
export const ML_USERNAME = 'ML';

export enum ActionScreen {
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
  ML = 'ML',
}

export type IABMetadata = {
  taxonomy: string;
  categories: string[];
};

export type ApprovedItemRequiredInput = {
  prospectId?: string;
  title: string;
  excerpt: string;
  authors: ApprovedItemAuthor[];
  status: CuratedStatus;
  language: CorpusLanguage;
  publisher?: string;
  imageUrl: string;
  topic: string;
  source: CorpusItemSource;
  isTimeSensitive: boolean;
};

export type CreateOrUpdateSectionApiInput = {
  externalId: string;
  title: string;
  description?: string;
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
  iab?: IABMetadata;
  sort?: number;
  createSource: ActivitySource;
  active: boolean;
  disabled: boolean;
  followable?: boolean;
  allowAds?: boolean;
};

export type UpdateCustomSectionApiInput = {
  externalId: string;
  title: string;
  description: string;
  heroTitle?: string;
  heroDescription?: string;
  startDate: string;
  endDate?: string;
  iab?: IABMetadata;
  sort?: number;
  updateSource: ActivitySource;
  followable?: boolean;
  allowAds?: boolean;
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

export type UpdateSectionItemApiInput = {
  externalId: string;
  rank: number;
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

export enum ScheduledSurfacesEnum {
  NEW_TAB_EN_US = 'NEW_TAB_EN_US',
  NEW_TAB_DE_DE = 'NEW_TAB_DE_DE',
  NEW_TAB_DE_AT = 'NEW_TAB_DE_AT',
  NEW_TAB_DE_CH = 'NEW_TAB_DE_CH',
  NEW_TAB_EN_GB = 'NEW_TAB_EN_GB',
  NEW_TAB_EN_CA = 'NEW_TAB_EN_CA',
  NEW_TAB_EN_IE = 'NEW_TAB_EN_IE',
  NEW_TAB_EN_XE = 'NEW_TAB_EN_XE',
  NEW_TAB_FR_FR = 'NEW_TAB_FR_FR',
  NEW_TAB_FR_BE = 'NEW_TAB_FR_BE',
  NEW_TAB_IT_IT = 'NEW_TAB_IT_IT',
  NEW_TAB_ES_ES = 'NEW_TAB_ES_ES',
  NEW_TAB_ES_XA = 'NEW_TAB_ES_XA',
  NEW_TAB_PL_PL = 'NEW_TAB_PL_PL',
  NEW_TAB_EN_INTL = 'NEW_TAB_EN_INTL',
  POCKET_HITS_EN_US = 'POCKET_HITS_EN_US',
  POCKET_HITS_DE_DE = 'POCKET_HITS_DE_DE',
  SANDBOX = 'SANDBOX',
}

export enum MozillaAccessGroup {
  READONLY = 'mozilliansorg_pocket_new_tab_readonly', // Read only access to all curation tools
  DEVELOPMENT_FULL = 'mozilliansorg_pocket_new_tab_development_full', // Full access to all surfaces in development environment
  COLLECTION_CURATOR_FULL = 'mozilliansorg_pocket_collection_curator_full', // Access to full collection tool
  SCHEDULED_SURFACE_CURATOR_FULL = 'mozilliansorg_pocket_scheduled_surface_curator_full', // Access to full corpus tool, implies they have access to all scheduled surfaces.
  NEW_TAB_CURATOR_ENUS = 'mozilliansorg_pocket_new_tab_curator_enus', // Access to en-US new tab in the corpus tool.
  NEW_TAB_CURATOR_DEDE = 'mozilliansorg_pocket_new_tab_curator_dede', // Access to de-DE new tab in corpus tool.
  NEW_TAB_CURATOR_DEAT = 'mozilliansorg_pocket_new_tab_curator_deat', // Access to de-AT new tab in corpus tool.
  NEW_TAB_CURATOR_DECH = 'mozilliansorg_pocket_new_tab_curator_dech', // Access to de-CH new tab in corpus tool.
  NEW_TAB_CURATOR_ENGB = 'mozilliansorg_pocket_new_tab_curator_engb', // Access to en-GB new tab in corpus tool.
  NEW_TAB_CURATOR_ENCA = 'mozilliansorg_pocket_new_tab_curator_enca', // Access to en-CA new tab in corpus tool.
  NEW_TAB_CURATOR_ENIE = 'mozilliansorg_pocket_new_tab_curator_enie', // Access to en-IE new tab in corpus tool.
  NEW_TAB_CURATOR_ENXE = 'mozilliansorg_pocket_new_tab_curator_enxe', // Access to en-XE (cross-Europe English) new tab in corpus tool.
  NEW_TAB_CURATOR_FRFR = 'mozilliansorg_pocket_new_tab_curator_frfr', // Access to fr-FR new tab in corpus tool.
  NEW_TAB_CURATOR_FRBE = 'mozilliansorg_pocket_new_tab_curator_frbe', // Access to fr-BE new tab in corpus tool.
  NEW_TAB_CURATOR_ITIT = 'mozilliansorg_pocket_new_tab_curator_itit', // Access to it-IT new tab in corpus tool.
  NEW_TAB_CURATOR_ESES = 'mozilliansorg_pocket_new_tab_curator_eses', // Access to es-ES new tab in corpus tool.
  NEW_TAB_CURATOR_ESXA = 'mozilliansorg_pocket_new_tab_curator_esxa', // Access to es-XA (cross-Latin America Spanish) new tab in corpus tool.
  NEW_TAB_CURATOR_PLPL = 'mozilliansorg_pocket_new_tab_curator_plpl', // Access to pl-PL new tab in corpus tool.
  NEW_TAB_CURATOR_ENINTL = 'mozilliansorg_pocket_new_tab_curator_enintl', // Access to en-INTL new tab in corpus tool.
  POCKET_HITS_CURATOR_ENUS = 'mozilliansorg_pocket_pocket_hits_curator_enus', // Access to en us Pocket Hits in the corpus tool.
  POCKET_HITS_CURATOR_DEDE = 'mozilliansorg_pocket_pocket_hits_curator_dede', // Access to de de Pocket Hits in the corpus tool.
  CURATOR_SANDBOX = 'mozilliansorg_pocket_curator_sandbox', // Access to sandbox test surface in the corpus tool.
}

export type ScheduledSurface = {
  name: string;
  guid: string;
  ianaTimezone: string;
  accessGroup: string;
};

export const ScheduledSurfaces: ScheduledSurface[] = [
  {
    name: 'New Tab (en-US)',
    guid: 'NEW_TAB_EN_US',
    ianaTimezone: 'America/New_York',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENUS,
  },
  {
    name: 'New Tab (en-CA)',
    guid: 'NEW_TAB_EN_CA',
    ianaTimezone: 'America/Toronto',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENCA,
  },
  {
    name: 'New Tab (de-DE)',
    guid: 'NEW_TAB_DE_DE',
    ianaTimezone: 'Europe/Berlin',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
  },
  {
    name: 'New Tab (de-AT)',
    guid: 'NEW_TAB_DE_AT',
    ianaTimezone: 'Europe/Vienna',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_DEAT,
  },
  {
    name: 'New Tab (de-CH)',
    guid: 'NEW_TAB_DE_CH',
    ianaTimezone: 'Europe/Zurich',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_DECH,
  },
  {
    name: 'New Tab (en-GB)',
    guid: 'NEW_TAB_EN_GB',
    ianaTimezone: 'Europe/London',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENGB,
  },
  {
    name: 'New Tab (en-IE)',
    guid: 'NEW_TAB_EN_IE',
    ianaTimezone: 'Europe/Dublin',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENIE,
  },
  {
    name: 'New Tab (EN Europe)',
    guid: 'NEW_TAB_EN_XE',
    ianaTimezone: 'Europe/Berlin',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENXE,
  },
  {
    name: 'New Tab (fr-FR)',
    guid: 'NEW_TAB_FR_FR',
    ianaTimezone: 'Europe/Paris',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_FRFR,
  },
  {
    name: 'New Tab (fr-BE)',
    guid: 'NEW_TAB_FR_BE',
    ianaTimezone: 'Europe/Brussels',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_FRBE,
  },
  {
    name: 'New Tab (it-IT)',
    guid: 'NEW_TAB_IT_IT',
    ianaTimezone: 'Europe/Rome',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ITIT,
  },
  {
    name: 'New Tab (es-ES)',
    guid: 'NEW_TAB_ES_ES',
    ianaTimezone: 'Europe/Madrid',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ESES,
  },
  {
    name: 'New Tab (ES Global)',
    guid: 'NEW_TAB_ES_XA',
    ianaTimezone: 'America/Mexico_City',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ESXA,
  },
  {
    name: 'New Tab (pl-PL)',
    guid: 'NEW_TAB_PL_PL',
    ianaTimezone: 'Europe/Warsaw',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_PLPL,
  },
  {
    name: 'New Tab (en-INTL)',
    guid: 'NEW_TAB_EN_INTL',
    ianaTimezone: 'Asia/Kolkata',
    accessGroup: MozillaAccessGroup.NEW_TAB_CURATOR_ENINTL,
  },
  {
    name: 'Pocket Hits (en-US)',
    guid: 'POCKET_HITS_EN_US',
    ianaTimezone: 'America/New_York',
    accessGroup: MozillaAccessGroup.POCKET_HITS_CURATOR_ENUS,
  },
  {
    name: 'Pocket Hits (de-DE)',
    guid: 'POCKET_HITS_DE_DE',
    ianaTimezone: 'Europe/Berlin',
    accessGroup: MozillaAccessGroup.POCKET_HITS_CURATOR_DEDE,
  },

  {
    name: 'Sandbox',
    guid: 'SANDBOX',
    ianaTimezone: 'America/New_York',
    accessGroup: MozillaAccessGroup.CURATOR_SANDBOX,
  },
];

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
