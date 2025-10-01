import {
  getS3UrlForImageUrl,
  uploadImageToS3FromUrl,
  uploadImageToS3,
} from './upload';
import * as Utils from './utils';
import s3 from './s3';
import Upload from 'graphql-upload/Upload.js';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import config from '../../config';

const testFilePath = __dirname + '/test-image.jpeg';

// Port is not used in CircleCI, so make it optional in the regex.
// Also, AWS Upload turns the test file in CircleCI into a PNG.
export const integrationTestsS3UrlPattern = new RegExp(
  `^http://localhost?/${config.aws.s3.bucket}/.+.(jpeg|png)$`,
);

function expectSuccessfulUpload(url: string) {
  // Check that the returned url matches the expected pattern
  // http://localstack:4566/curated-corpus-api-local-images/some-random-path.jpeg
  expect(url).toMatch(integrationTestsS3UrlPattern);
}

describe('Upload', () => {
  describe('uploadImageToS3', () => {
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

      expectSuccessfulUpload(upload.url);
    });
  });

  describe('uploadImageToS3FromUrl', () => {
    it('uploads an image to s3 using a URL with a valid content-type', async () => {
      // mock function to control response of fetching remote image
      const spy = jest
        .spyOn(Utils, 'fetchImageFromUrl')
        .mockImplementation(async () => {
          const response = {
            headers: new Headers({
              // this is all that really matters in this mock
              'Content-Type': 'image/png',
            }),
            body: 'fakeimagebody',
          } as any as Response;

          return Promise.resolve(response);
        });

      const upload = await uploadImageToS3FromUrl(
        s3,
        'https://some.external.domain/image.jpg',
      );

      expectSuccessfulUpload(upload.url);

      expect(spy).toHaveBeenCalledTimes(1);

      jest.restoreAllMocks();
    });

    it('fails to upload an image to s3 using a URL with an invalid content-type', async () => {
      // mock function to control response of fetching remote image
      const spy = jest
        .spyOn(Utils, 'fetchImageFromUrl')
        .mockImplementation(async () => {
          const response = {
            headers: new Headers({
              // this is all that really matters in this mock
              'Content-Type': 'text/javascript',
            }),
            body: 'someMaliciousJs',
          } as any as Response;

          return Promise.resolve(response);
        });

      await expect(
        uploadImageToS3FromUrl(s3, 'https://some.external.domain/image.jpg'),
      ).rejects.toThrow(
        new Error(
          `Unknown/unexpected content-type for image: https://some.external.domain/image.jpg`,
        ),
      );

      expect(spy).toHaveBeenCalledTimes(1);

      jest.restoreAllMocks();
    });
  });

  describe('getS3UrlForImageUrl', () => {
    it('should return the given URL if it is already in our S3 bucket', async () => {
      const inputUrl =
        'http://localhost:4566/curated-corpus-api-local-images/fakeimage.png';
      const url = await getS3UrlForImageUrl(s3, inputUrl);

      // we should get the exact same URL back, as the URL is already in our
      // S3 bucket
      expect(url).toEqual(inputUrl);
    });

    it('should upload the image to S3 and return that URL if the given image is not already in our S3 bucket', async () => {
      // mock function to control response of fetching remote image
      const spy = jest
        .spyOn(Utils, 'fetchImageFromUrl')
        .mockImplementation(async () => {
          const response = {
            headers: new Headers({
              // this is all that really matters in this mock
              'Content-Type': 'image/png',
            }),
            body: 'fakeimagebody',
          } as any as Response;

          return Promise.resolve(response);
        });

      const url = await getS3UrlForImageUrl(
        s3,
        'https://some.external.domain/image.jpg',
      );

      expect(spy).toHaveBeenCalledTimes(1);

      expectSuccessfulUpload(url);

      jest.restoreAllMocks();
    });

    it('should return null if the external source URL is not an image', async () => {
      // mock function to control response of fetching remote image
      const spy = jest
        .spyOn(Utils, 'fetchImageFromUrl')
        .mockImplementation(async () => {
          const response = {
            headers: new Headers({
              // this is all that really matters in this mock
              'Content-Type': 'text/javascript',
            }),
            body: 'someMaliciousJs',
          } as any as Response;

          return Promise.resolve(response);
        });

      const url = await getS3UrlForImageUrl(
        s3,
        'https://some.external.domain/image.jpg',
      );

      expect(spy).toHaveBeenCalledTimes(1);

      expect(url).toBeNull();

      jest.restoreAllMocks();
    });
  });
});
