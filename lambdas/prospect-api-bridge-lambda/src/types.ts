// this is the raw data from metaflow/sqs
export interface SqsProspect {
  prospect_id: string;
  scheduled_surface_guid: string;
  predicted_topic: string;
  prospect_source: string;
  url: string;
  save_count: number;
  rank: number;
}

type ProspectCandidateType = 'prospect';

enum SqsProspectSetVersion {
  v3 = 3,
}

export interface SqsProspectSet {
  /**
   * ID for the prospect candidate set as a whole
   */
  id: string;
  /**
   * Used to distinguish SQS schema versions. Currently equal to 3.
   */
  version: SqsProspectSetVersion;
  /**
   * The prospects in this set.
   */
  candidates: [SqsProspect];
  /**
   * Candidate type. For prospects this is always 'prospect'.
   * Used to distinguish from recommendation candidate sets.
   */
  type: ProspectCandidateType;
  /**
   * Metaflow flow name
   */
  flow: string;
  /**
   * Metaflow run id
   */
  run: string;
  /**
   * Unix time in seconds at which the prospect set expires.
   */
  expires_at: number;
}
