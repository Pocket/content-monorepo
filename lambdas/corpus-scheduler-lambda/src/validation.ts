import { ScheduledCandidate } from './types';
import { assert } from 'typia';
import { DateTime, Interval } from 'luxon';
import config from './config';

/**
 * Validates the scheduled date for a candidate
 * Calculates the time difference (between current date & scheduled date (12 am))
 * If a candidate is scheduled for Monday - Saturday, time diff >= 14 hrs
 * If a candidate is scheduled for Sunday, time diff >= 32 hrs
 * @param scheduledDate scheduledDate for an item from Metaflow
 */
export const validateScheduledDate = async (
  scheduledDate: string,
): Promise<void> => {
  // get the DateTime from an ISO scheduled date string
  const isoScheduledDateTime = DateTime.fromISO(scheduledDate, { zone: config.validation.timeZone });

  // 1. get the current date time for America/Los_Angeles
  const currentTime = DateTime.fromObject(
    {},
    {
      zone: config.validation.timeZone,
    },
  ).toISO();

  // 2. get the day # of the week for the scheduled date using weekday func from DateTime
  const scheduledDay = isoScheduledDateTime.weekday;

  // 3. Calculate the time difference between current date & scheduled date in hours
  const timeDifference = Interval.fromDateTimes(
    DateTime.fromISO(currentTime!),
      isoScheduledDateTime,
  ).length('hours');

  if (!timeDifference) {
    throw new Error(
      'validateScheduledDate: cannot compute the time difference',
    );
  }

  // 4. If scheduled date is Sunday, min time diff is 32 hrs
  if (scheduledDay === config.validation.ISO_SUNDAY) {
    if (timeDifference < config.validation.SUNDAY_MIN_DIFF) {
      throw new Error(
        'validateScheduledDate: candidate scheduled for Sunday needs to arrive minimum 32 hours in advance',
      );
    }
  }
  // 5. else, scheduled date is for Monday - Saturday, min time diff is 14 hrs
  else {
    if (timeDifference < config.validation.MON_SAT_MIN_DIFF) {
      throw new Error(
        'validateScheduledDate: candidate scheduled for Monday - Saturday needs to arrive minimum 14 hours in advance',
      );
    }
  }
};

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
  // validate candidate scheduled date
  await validateScheduledDate(candidate.scheduled_corpus_item.scheduled_date);
}
