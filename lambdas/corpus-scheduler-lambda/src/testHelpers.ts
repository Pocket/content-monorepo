import {ScheduledCandidate, ScheduledCandidates} from './types';
import {CorpusItemSource, CreateApprovedItemInput, CuratedStatus} from 'content-common/dist/types';
import {CorpusLanguage, Topics, UrlMetadata} from 'prospectapi-common';

export const createScheduledCandidates = (candidates: ScheduledCandidate[]): ScheduledCandidates => {
    return {
        candidates: candidates
    };
}
export const createScheduledCandidate = (title?: string, excerpt?: string, imageUrl?: string, language?: CorpusLanguage, authors?: string[], url?:string): ScheduledCandidate => {
    return {
        scheduled_corpus_candidate_id: 'a4b5d99c-4c1b-4d35-bccf-6455c8df07b0',
        scheduled_corpus_item: {
            url: url || 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
            status: CuratedStatus.RECOMMENDATION,
            source: CorpusItemSource.MANUAL,
            topic: Topics.SELF_IMPROVEMENT,
            created_by: 'ML',
            scheduled_date: '2024-02-22',
            scheduled_surface_guid: 'NEW_TAB_EN_US',
            title: title,
            excerpt: excerpt,
            language: language,
            image_url: imageUrl,
            authors: authors
        },
        features: {
            domain_prob: 0.7829,
            age_in_days: 0.1,
            data_source: 'prospect',
            day_of_week: 2,
            month: 2,
            open_count: 10.0,
            save_count: 0,
            word_count: 1865.0,
            approval_proba: 0.98,
            emotion_score: 1.5376,
            score: 117.9775,
            rank: 1,
            ml_version: 'v0.6'
        },
        run_details: {
            flow_name: 'ScheduleFlow',
            run_id: '3647'
        }
    }
}
export const expectedOutput: CreateApprovedItemInput = {
    url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
    title: 'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
    excerpt: 'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
    status: CuratedStatus.RECOMMENDATION,
    language: 'EN',
    publisher: 'POLITICO',
    authors: [ { name: 'Rebecca Jennings', sortOrder: 1 } ],
    imageUrl: 'https://fake-image-url.com',
    topic: Topics.SELF_IMPROVEMENT,
    source: CorpusItemSource.MANUAL,
    isCollection: false,
    isSyndicated: false,
    isTimeSensitive: false,
    scheduledDate: '2024-02-22',
    scheduledSurfaceGuid: 'NEW_TAB_EN_US'
}

export const parserItem: UrlMetadata = {
    url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
    title: 'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
    excerpt: 'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
    language: 'EN',
    publisher: 'POLITICO',
    authors: 'Rebecca Jennings',
    imageUrl: 'https://fake-image-url.com',
    isCollection: false,
    isSyndicated: false,
}