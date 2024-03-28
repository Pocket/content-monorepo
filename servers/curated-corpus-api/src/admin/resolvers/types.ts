import { ScheduledItem } from '.prisma/client';
import { ApprovedItem } from '../../database/types';
import { ScheduledItemSource } from '../../shared/types';
import { CorpusItemSource, CuratedStatus } from 'content-common';

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
