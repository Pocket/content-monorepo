import { CorpusItemSource, CorpusLanguage, CuratedStatus, Topics } from 'content-common';
import { tags } from 'typia';

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
  // TODO: set source to CorpusItemSource.ML once ML source is added
  source: CorpusItemSource.ML;
  topic: Topics; // Empty string means unknown topic
  scheduled_date: string; // YYYY-MM-DD
  scheduled_surface_guid: string;
  title?: string;
  excerpt?: string;
  language?: CorpusLanguage;
  image_url?: string;
  authors?: string[];
}

// TODO: add allowed surfaces here to schedule to production
export const allowedScheduledSurfaces: string[] = [];

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

export interface ApprovedCorpusItemOutput {
  externalId: string;
  url: string;
}

export interface ScheduledCorpusItemWithApprovedCorpusItemOutput
  extends ScheduledCorpusItemOutput {
  approvedItem: ApprovedCorpusItemOutput;
}

export interface ApprovedCorpusItemWithScheduleHistoryOutput
  extends ApprovedCorpusItemOutput {
  scheduledSurfaceHistory: ScheduledCorpusItemOutput[];
}
