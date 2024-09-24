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
