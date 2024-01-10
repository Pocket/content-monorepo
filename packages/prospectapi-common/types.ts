// much of the data in this file comes from our shared data repository, which
// currently is a confluence doc:
// https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';

// this is the structure of an `Item` as returned by dynamo
// just a convenience return type
export type DynamoItem =
    | {
  [key: string]: NativeAttributeValue;
}
    | undefined;

// we may want to move these enums/types to a more shareable location
// will refactor if/when needed
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

// these values will need to match those listed in the source of truth doc:
// https://mozilla-hub.atlassian.net/wiki/spaces/PE/pages/390642851/Pocket+Shared+Data#Prospect-Types
export enum ProspectType {
  TIMESPENT = 'TIMESPENT',
  COUNTS = 'COUNTS',
  SYNDICATED_NEW = 'SYNDICATED_NEW',
  SYNDICATED_RERUN = 'SYNDICATED_RERUN',
  DOMAIN_ALLOWLIST = 'DOMAIN_ALLOWLIST',
  TOP_SAVED = 'TOP_SAVED',
  RECOMMENDED = 'RECOMMENDED',
  COUNTS_MODELED = 'COUNTS_MODELED',
  TIMESPENT_MODELED = 'TIMESPENT_MODELED',
  TITLE_URL_MODELED = 'TITLE_URL_MODELED',
  RSS_LOGISTIC = 'RSS_LOGISTIC',
  RSS_LOGISTIC_RECENT = 'RSS_LOGISTIC_RECENT',
  DISMISSED = 'DISMISSED',
  CONSTRAINT_SCHEDULE = 'CONSTRAINT_SCHEDULE',
}

// languages we support in the corpus
export enum CorpusLanguage {
  EN = 'EN',
  DE = 'DE',
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
}

// this is the type used in most of the code and in dynamo
export type Prospect = {
  // a GUID we generate prior to inserting into dynamo
  id: string;
  // the prospect ID supplied by ML
  prospectId: string;
  // this will match the name in ScheduledSurfaces (below)
  // should this map to that type? would make lookups/type validation a pain...
  // however, this value *is* validated against the array below when coming
  // from sqs/before being inserted into dynamo, so checking does occur
  scheduledSurfaceGuid: string;
  topic?: Topics;
  prospectType: ProspectType;
  url: string;
  saveCount: number;
  rank: number;
  curated?: boolean;
  // unix timestamp
  createdAt?: number;
  // below properties will be populated via client api/parser
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
};

// a scheduled surface has a name as well as an array of associated ProspectTypes
export type ScheduledSurface = {
  name: string;
  guid: string;
  ianaTimezone: string;
  prospectTypes: ProspectType[];
};

// all the filters on the `getProspects` query
export type GetProspectsFilters = {
  scheduledSurfaceGuid: string;
  prospectType?: ProspectType;
  includePublisher?: string;
  excludePublisher?: string;
};

// defines all scheduled surfaces and their valid prospect types
// this will need to be kept in-sync with the source of truth confluence:
// https://getpocket.atlassian.net/wiki/spaces/PE/pages/2564587582/Prospecting+Candidate+Sets
// (this data is used in both ML & backend processes - is there a better
// place to store/reference it? probably not at the moment...)
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
      ProspectType.CONSTRAINT_SCHEDULE,
    ],
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
    ],
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
  },
  {
    name: 'New Tab (fr-FR)',
    guid: 'NEW_TAB_FR_FR',
    ianaTimezone: 'Europe/Paris',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
  },
  {
    name: 'New Tab (it-IT)',
    guid: 'NEW_TAB_IT_IT',
    ianaTimezone: 'Europe/Rome',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
  },
  {
    name: 'New Tab (es-ES)',
    guid: 'NEW_TAB_ES_ES',
    ianaTimezone: 'Europe/Madrid',
    prospectTypes: [ProspectType.DOMAIN_ALLOWLIST],
  },
  {
    name: 'New Tab (en-INTL)',
    guid: 'NEW_TAB_EN_INTL',
    ianaTimezone: 'Asia/Kolkata',
    prospectTypes: [
      ProspectType.COUNTS,
      ProspectType.TIMESPENT,
      ProspectType.RECOMMENDED,
      ProspectType.TITLE_URL_MODELED,
      ProspectType.DISMISSED,
    ],
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
  },
  {
    name: 'Sandbox',
    guid: 'SANDBOX',
    ianaTimezone: 'America/New_York',
    prospectTypes: [],
  },
];

export type ClientApiResponse = {
  data: {
    getItemByUrl: ClientApiItem;
  };
};

export type ClientApiDomainMeta = {
  name: string;
};

export type ClientApiSyndicatedArticle = {
  authorNames: string[];
  excerpt?: string;
  mainImage?: string;
  publisher?: {
    name?: string;
    url?: string;
  };
  title: string;
};

export type ClientApiCollection = {
  slug: string;
};

export type ClientApiAuthor = {
  name: string;
};

export type ClientApiItem = {
  domainMetadata?: ClientApiDomainMeta;
  excerpt?: string;
  language?: string;
  resolvedUrl: string;
  syndicatedArticle?: ClientApiSyndicatedArticle;
  title?: string;
  topImageUrl?: string;
  collection?: ClientApiCollection;
  authors?: ClientApiAuthor[];
};

export type UrlMetadata = {
  url: string;
  imageUrl?: string;
  publisher?: string;
  domain?: string;
  title?: string;
  excerpt?: string;
  language?: string;
  isSyndicated?: boolean;
  isCollection?: boolean;
  // authors is a comma separated string
  authors?: string;
};
