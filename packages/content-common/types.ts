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

export type CreateApprovedItemInput = ApprovedItemRequiredInput & {
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
};

// prospect-api
export interface UrlMetadata {
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
}
