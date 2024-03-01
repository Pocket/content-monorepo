import { tags } from 'typia';

// scheduled_corpus_candidate entity
export type SnowplowScheduledCorpusCandidate = {
  scheduled_corpus_candidate_id: string;
  scheduled_corpus_item_external_id?: string;
  approved_corpus_item_external_id?: string;
  candidate_url: string;
  error_name?: ScheduledCorpusCandidateErrorName;
  error_description?: string;
  features: ScheduledCorpusCandidateFeatures;
  run_details: ScheduledCorpusCandidateRunDetails;
};

export enum ScheduledCorpusCandidateErrorName {
  ALREADY_SCHEDULED = 'ALREADY_SCHEDULED',
  INSUFFICIENT_TIME_BEFORE_SCHEDULED_DATE = 'INSUFFICIENT_TIME_BEFORE_SCHEDULED_DATE',
  DOMAIN_NOT_ALLOWED_FOR_AUTO_SCHEDULING = 'DOMAIN_NOT_ALLOWED_FOR_AUTO_SCHEDULING',
  MISSING_EXCERPT = 'MISSING_EXCERPT',
  MISSING_TITLE = 'MISSING_TITLE',
  MISSING_IMAGE = 'MISSING_IMAGE',
}

export type ScheduledCorpusCandidateFeatures = {
  rank: number & tags.Type<'int64'>; // rank is integer in Snowplow schema
  score: number;
  data_source: string;
  ml_version: string;
  [key: string]: string | number;
};

export type ScheduledCorpusCandidateRunDetails = {
  flow_name: string;
  run_id: string;
  [key: string]: any;
};
