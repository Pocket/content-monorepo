import { tags } from 'typia';

import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
  ScheduledSurfacesEnum,
} from 'content-common';
import { ApprovedCorpusItemOutput } from 'lambda-common';

export interface ScheduledCandidates {
  candidates: ScheduledCandidate[];
}
export interface ScheduledCandidate {
  scheduled_corpus_candidate_id: string;
  scheduled_corpus_item: ScheduledCorpusItem;
  features: ScheduledCorpusCandidateFeatures;
  run_details: ScheduledCorpusCandidateRunDetails;
}

export interface ScheduledCorpusItem {
  url: string;
  status: CuratedStatus;
  source: CorpusItemSource.ML;
  topic: Topics; // Empty string means unknown topic
  scheduled_date: string; // YYYY-MM-DD
  scheduled_surface_guid: ScheduledSurfacesEnum;
  title: string | null;
  excerpt: string | null;
  language: CorpusLanguage | null;
  image_url: string | null;
  authors: string[] | null;
  date_published: string | null;
}

export const allowedScheduledSurfaces: string[] = [
  'NEW_TAB_EN_US',
  'NEW_TAB_DE_DE',
];

export type ScheduledCorpusCandidateFeatures = {
  rank: number & tags.Type<'int64'>; // rank is integer in Snowplow schema
  score: number;
  data_source: string;
  ml_version: string;
  [key: string]: string | number; // ML controls which additional features are sent
};

export type ScheduledCorpusCandidateRunDetails = {
  flow_name: string;
  run_id: string;
  [key: string]: any; // ML controls which additional run debug info is sent
};

interface ScheduledCorpusItemOutput {
  externalId: string;
}

export interface ScheduledCorpusItemWithApprovedCorpusItemOutput
  extends ScheduledCorpusItemOutput {
  approvedItem: ApprovedCorpusItemOutput;
}

export interface ApprovedCorpusItemWithScheduleHistoryOutput
  extends ApprovedCorpusItemOutput {
  scheduledSurfaceHistory: ScheduledCorpusItemOutput[];
}
