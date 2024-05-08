import { ScheduledSurfacesEnum } from 'content-common';

import {
  ScheduledCorpusCandidateFeatures,
  ScheduledCorpusCandidateRunDetails,
} from '../types';

// scheduled_corpus_candidate entity
export type SnowplowScheduledCorpusCandidate = {
  approved_corpus_item_external_id?: string;
  candidate_url: string;
  error_description?: string;
  error_name?: SnowplowScheduledCorpusCandidateErrorName;
  features: ScheduledCorpusCandidateFeatures;
  run_details: ScheduledCorpusCandidateRunDetails;
  scheduled_corpus_candidate_id: string;
  scheduled_corpus_item_external_id?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_surface_id: ScheduledSurfacesEnum;
};

export enum SnowplowScheduledCorpusCandidateErrorName {
  ALREADY_SCHEDULED = 'ALREADY_SCHEDULED',
  MISSING_EXCERPT = 'MISSING_EXCERPT',
  MISSING_TITLE = 'MISSING_TITLE',
  MISSING_IMAGE = 'MISSING_IMAGE',
}
