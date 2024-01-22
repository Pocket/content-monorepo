import nock from 'nock';
import { unlinkSync, writeFileSync } from 'fs';
import Upload from 'graphql-upload/Upload.js';
import { getFileUploadFromUrl, getPocketCacheUrl } from './utils';
import { InvalidImageUrl } from './errors';

function getStreamContent(stream) {
  let content = '';
  return new Promise((resolve, reject) => {
    stream.on('data', (data) => (content += data.toString()));
    stream.on('end', () => resolve(content));
  });
}

describe('Upload Utils', () => {
  const testFilePath = __dirname + '/test-image.jpeg';

  beforeEach(() => {
    writeFileSync(testFilePath, 'I am an image');
  });

  afterEach(() => {
    unlinkSync(testFilePath);
  });

  it('converts an image from a URL to a graphql FileUpload type', async () => {
    nock('https://pocket-image-cache.com')
      .get('/dancing-in-the-air.jpeg')
      .replyWithFile(200, testFilePath, {
        'Content-Type': 'image/jpeg',
      });

    const image: Upload = await getFileUploadFromUrl(
      'https://pocket-image-cache.com/dancing-in-the-air.jpeg'
    );

    const stream = image.createReadStream();
    const content = await getStreamContent(stream);

    expect(content).toEqual('I am an image');
    expect(image.filename).toBe('image.jpeg');
    expect(image.mimetype).toBe('image/jpeg');
    expect(image.encoding).toBe('7bit');
  });

  it('throws an error if the URL content is not an image', async () => {
    nock('https://pocket-image-cache.com')
      .get('/dancing-in-the-air.jpeg')
      .replyWithFile(200, testFilePath, {
        'Content-Type': 'application/json',
      });

    await expect(
      getFileUploadFromUrl(
        'https://pocket-image-cache.com/dancing-in-the-air.jpeg'
      )
    ).rejects.toThrow(InvalidImageUrl);
  });

  it('converts url to pocket cache URL', async () => {
    expect(
      getPocketCacheUrl('https://sweet-potato.jpg?is_sweet=yes and no')
    ).toEqual(
      'https://pocket-image-cache.com/x/filters:format(jpeg):quality(100):no_upscale():strip_exif()/https%3A%2F%2Fsweet-potato.jpg%3Fis_sweet%3Dyes%20and%20no'
    );
  });

  it('does not convert pocket-image-cache URLs', async () => {
    expect(
      getPocketCacheUrl('https://pocket-image-cache.com/x/https://banana')
    ).toEqual('https://pocket-image-cache.com/x/https://banana');
  });
});
