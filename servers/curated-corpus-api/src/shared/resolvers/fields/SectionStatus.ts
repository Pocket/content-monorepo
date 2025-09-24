import { DateTime } from 'luxon';
import { SectionStatus } from '../../types';
import { ScheduledSurfaces } from 'content-common';

interface Section {
  scheduledSurfaceGuid: string;
  disabled: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

/**
 * Dynamically compute the status of a Section based on:
 * - its `disabled` flag
 * - its `startDate` and `endDate`
 * - the current local time in the section's scheduled surface timezone
 *
 * Timezones matter: the "current day" is evaluated in the section's local time,
 * not in UTC.
 */
export function computeSectionStatus(section: Section): SectionStatus {
  // 1. Look up the timezone from the section's scheduled surface
  const scheduledSurface = ScheduledSurfaces.find(
    (s) => s.guid === section.scheduledSurfaceGuid
  );
  // Fallback to UTC if the surface doesn't have a configured timezone
  const timeZone = scheduledSurface?.ianaTimezone || 'UTC';

  // Normalize current time to the start of day in the section's local timezone
  const currentDate = DateTime.now().setZone(timeZone).startOf('day');

  // 1. DISABLED flag is true, overrides everything
  if (section.disabled) {
    return SectionStatus.DISABLED;
  }

  // 2. If section has a startDate (custom section logic)
  if (section.startDate) {
    const startDate = DateTime.fromJSDate(section.startDate).setZone(timeZone).startOf('day');

    // a. SCHEDULED: disabled flag is false AND startDate is in the future
    if (startDate > currentDate) {
      return SectionStatus.SCHEDULED;
    }

    // b. EXPIRED: disabled is false & section's endDate has passed (inclusive of full endDate)
    if (section.endDate) {
      const endDateExclusive = DateTime.fromJSDate(section.endDate)
        .setZone(timeZone)
        .startOf('day')
        .plus({ days: 1 });

      if (currentDate >= endDateExclusive) {
        return SectionStatus.EXPIRED;
      }
    }

    // c. LIVE: disabled is false AND startDate <= currentDate AND (endDate is null OR currentDate < endDate (inclusive of full endDate))
    if (
      startDate <= currentDate &&
      (!section.endDate || currentDate < DateTime.fromJSDate(section.endDate).setZone(timeZone).startOf('day').plus({ days: 1 }))
    ) {
      return SectionStatus.LIVE;
    }
  }

  // 3. For ML sections or sections without dates, if not disabled, they are LIVE
  return SectionStatus.LIVE;
}