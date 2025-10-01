import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload as AWSUpload } from '@aws-sdk/lib-storage';

import config from '../../config';
import Upload from 'graphql-upload/Upload.js';
import { ApprovedItemS3ImageUrl } from '../../shared/types';
import { fetchImageFromUrl } from './utils';

/**
 * if the given imageUrl is in our S3 bucket, return that url. otherwise,
 * copy the image from the given imageUrl into our S3 bucket and return
 * the resulting S3 url.
 *
 * this function is used when creating an approved item. if an approved item is
 * being managed from the admin tool, the image will already be in S3. if
 * being managed via ML, the image may point to the third party publisher URL.
 *
 * @param s3 AWS S3 client
 * @param imageUrl string
 * @returns the S3 image URL, or null if the upload to S3 fails
 */
export async function getS3UrlForImageUrl(
  s3: S3Client,
  imageUrl: string,
): Promise<string | null> {
  let s3ImageUrl;

  if (imageUrl.startsWith(config.aws.s3.path)) {
    // if the imageUrl is already in our S3 bucket, no more processing needed
    s3ImageUrl = imageUrl;
  } else {
    // try to upload the image to S3
    try {
      const upload: ApprovedItemS3ImageUrl = await uploadImageToS3FromUrl(
        s3,
        imageUrl,
      );

      s3ImageUrl = upload.url;
    } catch (err) {
      s3ImageUrl = null;
    }
  }

  return s3ImageUrl;
}

/**
 * uploads an image at the given imageUrl to our S3 bucket. this function is
 * called from the createApprovedItem mutation when passed an image URL that is
 * external/from a publisher (e.g. not in our S3 bucket).
 *
 * @param s3 AWS S3 client
 * @param imageUrl string
 * @returns ApprovedItemS3ImageUrl
 */
export async function uploadImageToS3FromUrl(
  s3: S3Client,
  imageUrl: string,
): Promise<ApprovedItemS3ImageUrl> {
  const imageResponse: Response = await fetchImageFromUrl(imageUrl);
  const contentType = imageResponse.headers.get('content-type') ?? undefined;

  // make sure we have an image
  if (contentType === undefined || !contentType.startsWith('image/')) {
    throw new Error(`Unknown/unexpected content-type for image: ${imageUrl}`);
  }

  const key = `${uuidv4()}.${mime.extension(contentType)}`;

  const upload = new AWSUpload({
    client: s3,
    params: {
      Bucket: config.aws.s3.bucket,
      Key: key,
      Body: imageResponse.body,
      ContentType: contentType,
      ACL: 'public-read',
    },
  });

  const uploadResponse = await upload.done();

  return {
    url:
      'Location' in uploadResponse // optional return parameter
        ? uploadResponse.Location
        : `${config.aws.s3.path}${key}`,
  };
}

/**
 * this function is called from the admin tool when uploading an image and
 * *before* creating/updating the approved item
 *
 * @param s3
 * @param image
 */
export async function uploadImageToS3(
  s3: S3Client,
  image: Upload,
): Promise<ApprovedItemS3ImageUrl> {
  const { mimetype, createReadStream } = image;
  const stream = createReadStream();
  const key = `${uuidv4()}.${mime.extension(mimetype)}`;

  // The S3 client requires the ContentLength heading; going
  // via their Upload utility negates the need for that when
  // the file length is unknown.
  const upload = new AWSUpload({
    client: s3,
    params: {
      Bucket: config.aws.s3.bucket,
      Key: key,
      Body: stream,
      ContentType: mimetype,
      ACL: 'public-read',
    },
  });

  const response = await upload.done();

  return {
    url:
      'Location' in response // optional return parameter
        ? response.Location
        : `${config.aws.s3.path}${key}`,
  };
}
