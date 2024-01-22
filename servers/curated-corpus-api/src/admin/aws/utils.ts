import Upload from 'graphql-upload/Upload.js';
import fetch from 'node-fetch';
import mime from 'mime-types';
import { InvalidImageUrl } from './errors';

/**
 * Fetch image from URL and transform into a GraphQL FileUpload object
 * @param url
 */
export async function getFileUploadFromUrl(url: string): Promise<Upload> {
  try {
    const res = await fetch(getPocketCacheUrl(url));
    const contentType = res.headers.get('content-type');

    checkValidImageContentType(contentType);

    return {
      filename: `image.${mime.extension(contentType)}`,
      mimetype: contentType,
      encoding: '7bit',
      createReadStream: () => res.body,
    };
  } catch (e) {
    throw new InvalidImageUrl();
  }
}

/**
 * Get pocket cache URL for a given URL
 * @param url
 */
export function getPocketCacheUrl(url: string) {
  if (url.includes('pocket-image-cache.com')) {
    return url;
  }

  return `https://pocket-image-cache.com/x/filters:format(jpeg):quality(100):no_upscale():strip_exif()/${encodeURIComponent(
    url
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
