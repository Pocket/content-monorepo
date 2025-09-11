import { DateTime } from 'luxon';
import { SectionStatus } from '../../../database/types';

interface Section {
  disabled: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

/**
 * Compute the status of a Section dynamically based on:
 * - disabled flag
 * - startDate
 * - endDate
 */
export function computeSectionStatus(section: Section): SectionStatus {
  const currentDate = DateTime.utc().startOf('day'); // Normalize to 00:00 UTC

  // 1. DISABLED flag is true, overrides everything
  if (section.disabled) {
    return SectionStatus.DISABLED;
  }

  // 2. If section has a startDate (custom section logic)
  if (section.startDate) {
    const startDate = DateTime.fromJSDate(section.startDate, { zone: 'utc' }).startOf('day');

    // a. SCHEDULED: disabled flag is false AND startDate is in the future
    if (startDate > currentDate) {
      return SectionStatus.SCHEDULED;
    }

    // b. EXPIRED: disabled is false AND currentDate >= endDate
    if (section.endDate) {
      const endDate = DateTime.fromJSDate(section.endDate, { zone: 'utc' }).startOf('day');
      if (currentDate >= endDate) {
        return SectionStatus.EXPIRED;
      }
    }

    // c. LIVE: disabled is false AND startDate <= currentDate AND (endDate is null OR currentDate < endDate)
    if (startDate <= currentDate && (!section.endDate || currentDate < DateTime.fromJSDate(section.endDate, { zone: 'utc' }).startOf('day'))) {
      return SectionStatus.LIVE;
    }
  }

  // 3. For ML sections or sections without dates, if not disabled, they are LIVE
  return SectionStatus.LIVE;
}