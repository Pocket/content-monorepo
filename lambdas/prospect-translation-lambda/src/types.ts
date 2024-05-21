// this is the raw data from metaflow/sqs
export interface SqsProspect {
  prospect_id: string;
  scheduled_surface_guid: string;
  predicted_topic: string;
  prospect_source: string;
  data_source?: string;
  url: string;
  save_count: number;
  rank: number;
}

export type ProspectFeatures = {
  data_source: string;
  rank: number''
  save_count: number;
  predicted_topic: string;
  [key: string]: string | number; // ML controls which additional features are sent
};

export type ProspectRunDetails = {
  candidate_set_id: string;
  // unix timestamp
  expires_at: number;
  flow: string;
  run_id: string;
  [key: string]: any; // ML controls which additional run debug info is sent
};
