import {
  ActionScreen,
  ApprovedItemAuthor,
  ApprovedItemGrade,
  CorpusLanguage,
  CreateScheduledItemInput,
  CuratedStatus,
  ScheduledItemSource,
} from 'content-common';

// this maps to the UpdateApprovedCorpusItemInput graph input
export type UpdateApprovedCorpusItemApiInput = {
  externalId: string;
  title: string;
  excerpt: string;
  authors: ApprovedItemAuthor[];
  status: CuratedStatus;
  language: CorpusLanguage;
  publisher: string;
  datePublished?: string;
  imageUrl: string;
  topic: string;
  grade?: ApprovedItemGrade;
  isTimeSensitive: boolean;
  actionScreen?: ActionScreen; // non-db, analytics only
};

// this maps to the UpdateApprovedCorpusItemGradeInput graph input
export type UpdateApprovedCorpusItemGradeApiInput = {
  externalId: string;
  grade: ApprovedItemGrade;
  actionScreen: ActionScreen; // non-db, analytics only
};

// type to map to the input coming from the graph mutation
export type CreateScheduledItemApiInput = CreateScheduledItemInput & {
  reasons?: string; // non-db, analytics only
  reasonComment?: string; // non-db, analytics only
  actionScreen?: ActionScreen; // non-db, analytics only
};

// this maps to the RejectApprovedCorpusItemInput graph input
export type RejectApprovedCorpusItemApiInput = {
  externalId: string;
  reason: string;
  actionScreen?: ActionScreen;
};

// this maps to the CreateRejectedCorpusItemInput graph input
export type CreateRejectedCorpusItemApiInput = {
  prospectId?: string;
  url: string;
  title?: string;
  topic: string;
  language?: CorpusLanguage;
  publisher?: string;
  reason: string;
  actionScreen?: ActionScreen;
};

export type RescheduleScheduledItemApiInput = {
  externalId: string;
  scheduledDate: string;
  source: ScheduledItemSource;
  actionScreen?: ActionScreen;
};
