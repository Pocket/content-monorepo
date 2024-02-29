import { ScheduledCandidate } from './types';
import { CorpusItemSource } from 'content-common/types';
import { assert } from 'typia';

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
 * Validates the source. Should be 'ML'. Reject item if a different source.
 * @param candidate ScheduledCandidate received from Metaflow
 * @param source source to be validated
 * @return CorpusItemSource
 */
export async function validateSource(
  candidate: ScheduledCandidate,
  source: CorpusItemSource,
): Promise<CorpusItemSource> {
  if (source !== 'ML') {
    throw new Error(
      `invalid source (${source}) for ${candidate.scheduled_corpus_candidate_id}`,
    );
  }
  return source;
}

/**
 * Validation wrapper. Calls the individual validation methods to validate the candidate.
 * @param candidate ScheduledCandidate received from Metaflow
 */
export async function validateCandidate(
  candidate: ScheduledCandidate,
): Promise<void> {
  // // validate candidate input against ScheduledCandidate
  // // this also validates if values are in enums
  assert<ScheduledCandidate>(candidate);
  // validate scheduled_corpus_item.source
  await validateSource(candidate, candidate.scheduled_corpus_item.source);
}
