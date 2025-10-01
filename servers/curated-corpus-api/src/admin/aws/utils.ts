/**
 * Get pocket cache URL for a given URL
 * @param url
 */
export function getPocketCacheUrl(url: string) {
  if (url.includes('pocket-image-cache.com')) {
    return url;
  }

  return `https://pocket-image-cache.com/x/filters:format(jpeg):quality(100):no_upscale():strip_exif()/${encodeURIComponent(
    url,
  )}`;
}

/**
 * Check content type header is a valid image content type.
 * Must begin with image
 * @param contentType
 */
export function checkValidImageContentType(contentType: string): boolean {
  if (!contentType?.startsWith('image')) throw new Error();

  return true;
}

/**
 * wrapper function for fetch so we can mock easily in tests
 *
 * @param imageUrl string
 * @returns Response
 */
export async function fetchImageFromUrl(imageUrl: string): Promise<Response> {
  return await fetch(imageUrl);
}
