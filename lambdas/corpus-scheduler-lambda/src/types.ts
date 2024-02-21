import { CreateApprovedItemInput } from 'content-common/types';
export interface ScheduledCandidates {
    candidates: ScheduledCandidate[];
}
export interface ScheduledCandidate {
    scheduled_corpus_candidate_id: string;
    scheduled_corpus_item: ScheduledCorpusItem;
    features: { [key: string]: string | number }; // ML controls which features are sent
    run_details: { [key: string]: string | number }; // ML controls which run debug info is sent
}

export type ScheduledCorpusItem = CreateApprovedItemInput & {
    createdBy: string;
}