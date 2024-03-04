import { CuratedStatus, ScheduledItem } from '@prisma/client';
import { ApprovedItem } from '../../database/types';
import { CorpusItemSource, ScheduledItemSource } from '../../shared/types';

export type ImportApprovedCorpusItemPayload = {
  approvedItem: ApprovedItem;
  scheduledItem: ScheduledItem;
};

export type ImportApprovedCorpusItemInput = {
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
