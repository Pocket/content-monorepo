import { CorpusLanguage, ProspectType } from 'content-common';

// this is the raw data from metaflow/sqs
export interface SqsProspect {
  data_source?: string;
  predicted_topic: string;
  prospect_id: string;
  prospect_source: string;
  rank: number;
  save_count: number;
  scheduled_surface_guid: string;
  url: string;
  // 2024-12-12
  // some ML prospects will contain URL metadata to be used instead of Parser
  // metadata. this is currently experimental, so all properties below are
  // optional.
  authors?: string[];
  excerpt?: string;
  image_url?: string;
  language?: CorpusLanguage;
  title?: string;
}

// 2024-12-12
// noting which prospect types will have ML-supplied URL metadata. this is
// likely a temporary array, as we should move to a consistent URL metadata
// source for all prospect types.
export const ProspectTypesWithMlUrlMetadata: ProspectType[] = [
  ProspectType.QA_ENTERTAINMENT,
  ProspectType.QA_GAMING,
  ProspectType.QA_HISTORY,
  ProspectType.QA_RELATIONSHIPS,
  ProspectType.QA_SPORTS,
];
