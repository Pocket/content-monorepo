import {ScheduledCandidate} from './types';
import {CorpusItemSource, Topics} from 'content-common/dist/types';
import {assert} from 'typia';

/**
 * TODO: https://mozilla-hub.atlassian.net/browse/MC-737
 * Validates the scheduled date for an item to be scheduled
 * @param scheduledDate scheduledDate for an item from Metaflow
 * @return ApprovedItemAuthor[]
 */
// const validateScheduledDate = (scheduledDate: string) => {
//
// }

/**
 * Validates the topic. Should be in the Topics enum or '' for topic not in Topics.
 * @param topic topic to be validated
 * @return Topics or ''
 */
const validateTopic = (topic: Topics | ' '): Topics | ' ' => {
    return (Object.values(Topics).includes(topic as any)) ? topic : ' ';
}

/**
 * Validates the source. Should be 'ML'. Reject item if a different source.
 * @param candidate ScheduledCandidate received from Metaflow
 * @param source source to be validated
 * @return CorpusItemSource
 */
function validateSource (candidate: ScheduledCandidate, source: CorpusItemSource) {
    if (source !== 'ML') {
        throw new Error(`invalid source (${source}) for ${candidate.scheduled_corpus_candidate_id}`);
    }
}

/**
 * Validates the title, excerpt & image url. Should not be empty.
 * @param candidate ScheduledCandidate received from Metaflow
 * @param title title to be validated
 * @param excerpt excerpt to be validated
 * @param imageUrl image url to be validated
 */
function validateTitleExcerptImageUrl (candidate: ScheduledCandidate, title: string, excerpt: string, imageUrl: string) {
    if (!title) {
        throw new Error(`title is empty for ${candidate.scheduled_corpus_candidate_id}`);
    }
    if (!excerpt) {
        throw new Error(`excerpt is empty for ${candidate.scheduled_corpus_candidate_id}`);
    }
    if (!imageUrl) {
        throw new Error(`imageUrl is empty for ${candidate.scheduled_corpus_candidate_id}`);
    }
}

/**
 * Validation wrapper. Calls the individual validation methods to validate the candidate.
 * @param candidate ScheduledCandidate received from Metaflow
 * @param topic topic to be validated
 * @param source source to be validated
 * @param title title to be validated
 * @param excerpt excerpt to be validated
 * @param imageUrl image url to be validated
 */
export function validateCandidate (candidate: ScheduledCandidate, topic: Topics | " ", source: CorpusItemSource, title: string, excerpt: string, imageUrl: string) {
    // // validate candidate input against ScheduledCandidate
    // // this also validates if values are in enums
    assert<ScheduledCandidate>(candidate);
    // validate scheduled_corpus_item.source
    validateSource(candidate, source);
    // validate scheduled_corpus_item.topic Topic
    candidate.scheduled_corpus_item.topic = validateTopic(topic);
    // validate title, excerpt, imageUrl
    validateTitleExcerptImageUrl(candidate, title, excerpt, imageUrl);
}
