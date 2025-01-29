import { pocketImageCache } from './types';

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
