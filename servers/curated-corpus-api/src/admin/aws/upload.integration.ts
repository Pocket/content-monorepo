import { uploadImageToS3 } from './upload';
import s3 from './s3';
import Upload from 'graphql-upload/Upload.js';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import config from '../../config';
import { ApprovedItemS3ImageUrl } from '../../shared/types';

const testFilePath = __dirname + '/test-image.jpeg';

// Port is not used in CircleCI, so make it optional in the regex.
// Also, AWS Upload turns the test file in CircleCI into a PNG.
export const integrationTestsS3UrlPattern = new RegExp(
  `^http://localhost?/${config.aws.s3.bucket}/.+.(jpeg|png)$`,
);

function expectSuccessfulUpload(upload: ApprovedItemS3ImageUrl) {
  // Check that the returned url matches the expected pattern
  // http://localstack:4566/curated-corpus-api-local-images/some-random-path.jpeg
  expect(upload.url).toMatch(integrationTestsS3UrlPattern);
}

describe('Upload', () => {
  beforeEach(() => {
    writeFileSync(testFilePath, 'I am an image');
  });

  afterEach(() => {
    unlinkSync(testFilePath);
  });

  it('uploads an image to s3 using graphql Upload type', async () => {
    const image: Upload = {
      filename: 'test.jpeg',
      mimetype: 'image/jpeg',
      encoding: '7bit',
      createReadStream: () => createReadStream(testFilePath),
    };

    const upload = await uploadImageToS3(s3, image);

    expectSuccessfulUpload(upload);
  });
});
