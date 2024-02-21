import { CreateApprovedItemInput } from 'content-common/types';
export interface ScheduledCandidate {
    scheduledCandidateId: string;
    scheduledCorpusItem: ScheduledCorpusItem;
    features: { [key: string]: string | number }; // ML controls which features are sent
}
export type ScheduledCorpusItem = CreateApprovedItemInput & {
    createdBy: string;
}