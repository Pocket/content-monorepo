import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload as AWSUpload } from '@aws-sdk/lib-storage';

import config from '../../config';
import Upload from 'graphql-upload/Upload.js';
import { ApprovedItemS3ImageUrl } from '../../shared/types';
import { getFileUploadFromUrl } from './utils';

/**
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
