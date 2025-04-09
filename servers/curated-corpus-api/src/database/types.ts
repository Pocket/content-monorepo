import {
  ApprovedItem as ApprovedItemModel,
  CuratedStatus,
  ScheduledItem as ScheduledItemModel,
  ScheduleReview,
  Section as SectionModel,
  SectionItem as SectionItemModel,
} from '.prisma/client';
import {
  ActivitySource,
  ApprovedItemAuthor,
  ApprovedItemRequiredInput,
  CorpusItemSource,
  CorpusLanguage,
  SectionItemRemovalReason,
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
  scheduleReview?: ScheduleReview;
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

export type MoveScheduledItemToBottomInput = {
  externalId: string;
  source: ActivitySource;
};

export type CreateScheduleReviewInput = {
  scheduledSurfaceGuid: string;
  scheduledDate: string;
};

export type CreateSectionInput = {
  externalId: string;
  title: string;
  scheduledSurfaceGuid: string;
  sort?: number;
  createSource: ActivitySource;
  active: boolean;
};

export type CreateSectionItemInput = {
  sectionId: number;
  approvedItemExternalId: string;
  rank?: number;
};

export type RemoveSectionItemInput = {
  externalId: string;
  deactivateReasons: SectionItemRemovalReason[];
};

export type DisableEnableSectionInput = {
  externalId: string;
  disabled: boolean;
}

export type ApprovedItem = ApprovedItemModel & {
  authors: ApprovedItemAuthor[];
};

export type SectionItem = SectionItemModel & {
  approvedItem: ApprovedItem;
};

export type Section = SectionModel & {
  sectionItems?: SectionItem[];
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
  isTimeSensitive: boolean;
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
