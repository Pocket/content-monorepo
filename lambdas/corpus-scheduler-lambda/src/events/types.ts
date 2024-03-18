import {
  ScheduledCorpusCandidateFeatures,
  ScheduledCorpusCandidateRunDetails,
} from '../types';

// scheduled_corpus_candidate entity
export type SnowplowScheduledCorpusCandidate = {
  scheduled_corpus_candidate_id: string;
  scheduled_corpus_item_external_id?: string;
  approved_corpus_item_external_id?: string;
  candidate_url: string;
  error_name?: SnowplowScheduledCorpusCandidateErrorName;
  error_description?: string;
  features: ScheduledCorpusCandidateFeatures;
  run_details: ScheduledCorpusCandidateRunDetails;
};

export enum SnowplowScheduledCorpusCandidateErrorName {
  ALREADY_SCHEDULED = 'ALREADY_SCHEDULED',
  MISSING_EXCERPT = 'MISSING_EXCERPT',
  MISSING_TITLE = 'MISSING_TITLE',
  MISSING_IMAGE = 'MISSING_IMAGE',
}
