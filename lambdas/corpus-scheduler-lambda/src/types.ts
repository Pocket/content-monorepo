import {CorpusLanguage, Topics} from 'prospectapi-common';
import { CuratedStatus, CorpusItemSource } from  'content-common/types';
export interface ScheduledCandidates {
    candidates: ScheduledCandidate[];
}
export interface ScheduledCandidate {
    scheduled_corpus_candidate_id: string;
    scheduled_corpus_item: ScheduledCorpusItem;
    features: { [key: string]: string | number }; // ML controls which features are sent
    run_details: { [key: string]: string | number }; // ML controls which run debug info is sent
}

interface ScheduledCorpusItem {
    url: string;
    status: CuratedStatus;
    // TODO: set source to CorpusItemSource.ML once ML source is added
    source: CorpusItemSource;
    topic: Topics | ' '; // Empty string means unknown topic
    created_by: string;
    scheduled_date: string; // YYYY-MM-DD
    scheduled_surface_guid: string;
    title?: string;
    excerpt?: string;
    language?: CorpusLanguage;
    image_url?: string;
    authors?: string[];
}