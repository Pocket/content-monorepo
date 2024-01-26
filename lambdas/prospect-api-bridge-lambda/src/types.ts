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

export enum CandidateType {
  /**
   * Prospect candidates are items that can be shown to curators for review in the curation admin tool.
   */
  PROSPECT = 'prospect',
  /**
   * The recommendation candidate set type is _probably_ not used anymore. It was used in the past to generate
   * recommendation candidate sets in Metaflow for Pocket Home and Pocket Explore Topic Pages.
   * It's included here to keep the schema
   */
  RECOMMENDATION = 'recommendation',
}

export enum CandidateSetVersion {
  V3 = 3,
}

export interface CandidateSet {
  /**
   * ID for the prospect candidate set as a whole
   */
  id: string;
  /**
   * Used to distinguish SQS schema versions. Currently equal to 3.
   */
  version: CandidateSetVersion;
  /**
   * The prospects in this set.
   */
  candidates: SqsProspect[];
  type: CandidateType;
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

export interface ProspectCandidateSet extends Omit<CandidateSet, 'type'> {
  /**
   * The type for a prospect candidate set should be 'prospect'.
   */
  type: CandidateType.PROSPECT;
}
