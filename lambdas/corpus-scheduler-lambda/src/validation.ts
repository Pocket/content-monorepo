import {pocketImageCache, ScheduledCandidate} from './types';
import {assert} from 'typia';
import {DateTime, Interval} from 'luxon';
import config from './config';
import {ScheduledSurfacesEnum} from "content-common";

/**
 * Validates the scheduled date for a candidate in a specified time zone
 * Calculates the time difference (between current date & scheduled date (12 am))
 * If a candidate is scheduled for Monday - Saturday, time diff >= 14 hrs
 * If a candidate is scheduled for Sunday, time diff >= 32 hrs
 * @param scheduledDate scheduledDate for an item from Metaflow
 * @param timeZone the time zone to do the validation in
 * @param publishHour the time when content gets published in specific time zone. Used in the base DateTime to calculate time diff.
 */
export const validateScheduledDate = async (
    scheduledDate: string,
    timeZone: string,
    publishHour: number
): Promise<void> => {
  // get the DateTime from an ISO scheduled date string in 12 AM of specified timezone.
  // Convert to appropriate hour:
  // PST = 12 AM
  // EST = 3 AM
  // Europe/Berlin = 9 AM
  const isoScheduledDateTime = DateTime.fromISO(scheduledDate, {
    zone: timeZone,
  }).plus({hours: publishHour});

  // 1. get the current date time for specified time zone
  const currentTime = DateTime.fromObject(
      {},
      {
        zone: timeZone,
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
        `validateScheduledDate (${timeZone}): cannot compute the time difference`,
    );
  }

  // IF EN_US
  if(timeZone === config.validation.EN_US.timeZone) {
    // 4. If scheduled date is Sunday, min time diff is 32 hrs
    if (scheduledDay === config.validation.ISO_SUNDAY) {
      if (timeDifference < config.validation.EN_US.SUNDAY_MIN_DIFF) {
        throw new Error(
            `validateScheduledDate (${timeZone}): candidate scheduled for Sunday needs to arrive minimum ${config.validation.EN_US.SUNDAY_MIN_DIFF} hours in advance`,
        );
      }
    }
    // 5. else, scheduled date is for Monday - Saturday, min time diff is 14 hrs
    else {
      if (timeDifference < config.validation.EN_US.MON_SAT_MIN_DIFF) {
        throw new Error(
            `validateScheduledDate (${timeZone}): candidate scheduled for Monday - Saturday needs to arrive minimum ${config.validation.EN_US.MON_SAT_MIN_DIFF} hours in advance`,
        );
      }
    }
  }

  // IF DE_DE
  else if(timeZone === config.validation.DE_DE.timeZone) {
    if (timeDifference < config.validation.DE_DE.MONDAY_SUNDAY_MIN_DIFF) {
      throw new Error(
          `validateScheduledDate (${timeZone}): candidate scheduled for Monday - Sunday needs to arrive minimum ${config.validation.DE_DE.MONDAY_SUNDAY_MIN_DIFF} hours in advance`,
      );
    }
  }
};
/**
 * Validates the image_url through Pocket Image CDN (https://pocket-image-cache.com/)
 * @param imageUrl imageUrl to validate
 * @returs string or null
 */
export async function validateImageUrl(
    imageUrl: string,
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }
  // construct the url to fetch (pocket_image_cache + image_url)
  const url = `${pocketImageCache}${encodeURIComponent(imageUrl)}`;
  // fetch the url
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });
  // if response is not ok, return null
  if (!response.ok) {
    return null;
  }
  return imageUrl;
}

/**
 * Validation wrapper. Calls the individual validation methods to validate the candidate.
 * @param candidate ScheduledCandidate received from Metaflow
 */
export async function validateCandidate(
    candidate: ScheduledCandidate,
): Promise<void> {
  // validate candidate input against ScheduledCandidate
  // this also validates if values are in enums
  assert<ScheduledCandidate>(candidate);
  // validate candidate scheduled date
  // if ENABLE_SCHEDULED_DATE_VALIDATION env var is true, validate the scheduled date
  if (config.app.enableScheduledDateValidation === 'true') {
    // default to EST timezone
    let timeZone  = config.validation.EN_US.timeZone;
    let publishHour = config.validation.EN_US.publishHour;
    //  if candidate is for NEW_TAB_DE_DE, use Berlin time (CET) scheduled date validation
    if(candidate.scheduled_corpus_item.scheduled_surface_guid === ScheduledSurfacesEnum.NEW_TAB_DE_DE) {
      timeZone = config.validation.DE_DE.timeZone;
      publishHour = config.validation.DE_DE.publishHour;
    }
    await validateScheduledDate(candidate.scheduled_corpus_item.scheduled_date, timeZone, publishHour);
  }
}
