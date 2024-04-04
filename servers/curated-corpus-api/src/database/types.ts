import {
  ApprovedItem as ApprovedItemModel,
  CuratedStatus,
  ScheduledItem as ScheduledItemModel,
} from '.prisma/client';
import {
  ApprovedItemAuthor,
  ApprovedItemRequiredInput,
  CorpusItemSource,
  CorpusLanguage,
  ScheduledItemSource,
} from 'content-common';

export type CreateApprovedItemInput = {
  prospectId?: string;
  url: string;
  title: string;
  excerpt: string;
  authors: ApprovedItemAuthor[];
  status: CuratedStatus;
  language: CorpusLanguage;
  publisher: string;
  datePublished?: string;
  imageUrl: string;
  topic: string;
  source: CorpusItemSource;
  isCollection: boolean;
  isTimeSensitive: boolean;
  isSyndicated: boolean;
};

export type ImportApprovedItemInput = {
  url: string;
  title: string;
  excerpt: string;
  status: CuratedStatus;
  language: string;
  publisher: string;
  imageUrl: string;
  topic: string;
  source: CorpusItemSource;
  isCollection: boolean;
  isSyndicated: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

export type ImportScheduledItemInput = {
  approvedItemId: number;
  scheduledSurfaceGuid: string;
  scheduledDate: string;
  source: ScheduledItemSource;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

export type PaginationInput = {
  after?: string;
  before?: string;
  first?: number;
  last?: number;
};

export type ApprovedItemFilter = {
  language?: string;
  status?: CuratedStatus;
  title?: string;
  topic?: string;
  url?: string;
};

export type RejectedCuratedCorpusItemFilter = {
  url?: string;
  title?: string;
  topic?: string;
  language?: string;
};

export type UpdateApprovedItemInput = Omit<
  ApprovedItemRequiredInput,
  'prospectId' | 'source'
> & {
  externalId: string;
  datePublished?: string;
};

export type UpdateApprovedItemAuthorsInput = {
  externalId: string;
  authors: ApprovedItemAuthor[];
};

export type RejectApprovedItemInput = {
  externalId: string;
  reason: string;
};

export type CreateRejectedItemInput = {
  prospectId?: string;
  url: string;
  title?: string;
  topic: string;
  language?: string;
  publisher?: string;
  reason: string;
};

export type ScheduledItem = ScheduledItemModel & {
  approvedItem: ApprovedItem;
};

export type ScheduledItemsResult = {
  scheduledDate: string;
  collectionCount: number;
  syndicatedCount: number;
  totalCount: number;
  items: ScheduledItem[];
};

export type ScheduledItemFilterInput = {
  scheduledSurfaceGuid: string;
  startDate: string;
  endDate: string;
};

export type DeleteScheduledItemInput = {
  externalId: string;
};

export type RescheduleScheduledItemInput = {
  externalId: string;
  scheduledDate: string;
  source: ScheduledItemSource;
};

export type ApprovedItem = ApprovedItemModel & {
  authors: ApprovedItemAuthor[];
};

/**
 * CorpusTargetType probably makes more sense to be a union of all Pocket types
 * or entities. An incremental step in that direction was chosen. If we want to
 * expand this approach for more systems then we can figure out how to best
 * accomplish when that utility is defined.
 */
export type CorpusTargetType = 'SyndicatedArticle' | 'Collection';

export type CorpusTarget = {
  slug: string;
  __typename: CorpusTargetType;
};

// Types for the public `scheduledSurface` query.
export type CorpusItem = {
  // This is `externalId` in the DB schema and Admin API
  id: string;
  url: string;
  title: string;
  authors: ApprovedItemAuthor[];
  excerpt: string;
  language: string;
  publisher: string;
  imageUrl: string;
  image: Image;
  topic?: string;
  target?: CorpusTarget;
};

export type Image = {
  url: string;
};

export type ScheduledSurfaceItem = {
  // This is `externalId` in the DB schema and Admin API
  id: string;
  surfaceId: string;
  scheduledDate: string;
  corpusItem: CorpusItem;
};

export type ScheduledSurface = {
  // This is `scheduledSurfaceGuid` in the DB schema and Admin API
  id: string;
  name: string;
  items?: ScheduledSurfaceItem[];
};

export type ApprovedItemScheduledSurfaceHistory = {
  externalId: string;
  createdBy: string;
  scheduledDate: string;
  scheduledSurfaceGuid: string;
};
