import { ScheduledItem } from '.prisma/client';
import { ApprovedItem } from '../../database/types';
import {
  ActionScreen,
  ApprovedItemAuthor,
  CorpusItemSource,
  CorpusLanguage,
  CreateScheduledItemInput,
  CuratedStatus,
  ScheduledItemSource,
} from 'content-common';

// this is the type returned from the importApprovedItem mutation
export type ImportApprovedCorpusItemPayload = {
  approvedItem: ApprovedItem;
  scheduledItem: ScheduledItem;
};

// this maps to the ImportApprovedCorpusItemInput graph input
export type ImportApprovedCorpusItemApiInput = {
  url: string;
  title: string;
  excerpt: string;
  status: CuratedStatus;
  language: string;
  publisher: string;
  imageUrl: string;
  topic?: string;
  source: CorpusItemSource;
  isCollection: boolean;
  isSyndicated: boolean;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  scheduledDate: string;
  scheduledSurfaceGuid: string;
  scheduledSource: ScheduledItemSource;
};

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
  isTimeSensitive: boolean;
  actionScreen?: ActionScreen; // non-db, analytics only
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
