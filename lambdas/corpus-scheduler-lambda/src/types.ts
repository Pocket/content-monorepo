import { CreateApprovedItemInput } from 'curated-corpus-api/src/database/types';

export interface ScheduledCandidate {
    scheduledCandidateId: string;
    scheduledCorpusItem: ScheduledCorpusItem;
    features: { [key: string]: string | number }; // ML controls which features are sent
}
export type ScheduledCorpusItem = CreateApprovedItemInput & {
    createdBy: string;
}