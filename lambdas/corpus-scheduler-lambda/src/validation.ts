import { ScheduledCandidate } from './types';
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
 * Validation wrapper. Calls the individual validation methods to validate the candidate.
 * @param candidate ScheduledCandidate received from Metaflow
 */
export async function validateCandidate(
  candidate: ScheduledCandidate,
): Promise<void> {
  // // validate candidate input against ScheduledCandidate
  // // this also validates if values are in enums
  assert<ScheduledCandidate>(candidate);
}
