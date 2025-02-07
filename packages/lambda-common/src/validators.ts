import { DateTime } from 'luxon';

import { pocketImageCache } from './constants';

/**
 * Validates the image_url through Pocket Image CDN (https://pocket-image-cache.com/)
 * @param imageUrl imageUrl to validate
 * @returs string or null
 */
export async function validateImageUrl(
  imageUrl: string,
): Promise<string | undefined> {
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
    return undefined;
  }

  return imageUrl;
}

/**
 * Validates a publication date for a curated item.
 * If this value comes from the Parser, it will look like a MySQL timestamp,
 * e.g. "2024-02-27 00:00:00".
 * For collections and syndicated items, it will be a date
 * in the "YYYY-MM-DD" format.
 *
 * @param date the date returned by the Parser via getUrlMetadata query
 * @return a date in the "YYYY-MM-DD" format if , or null
 *
 */
export const validateDatePublished = (
  date: string | null | undefined,
): string | null => {
  // Early exit if date is not provided
  if (!date) {
    return null;
  }

  // Discard the time component of the Parser date, if present, and convert it
  // to a Luxon DateTime object
  const possiblyDate = DateTime.fromFormat(date.substring(0, 10), 'yyyy-MM-dd');

  // If this IS a valid date, return it
  return possiblyDate.isValid ? possiblyDate.toSQLDate() : null;
};
