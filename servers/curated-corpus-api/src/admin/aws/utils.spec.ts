import { unlinkSync, writeFileSync } from 'fs';
import { getPocketCacheUrl } from './utils';

describe('Upload Utils', () => {
  const testFilePath = __dirname + '/test-image.jpeg';

  beforeEach(() => {
    writeFileSync(testFilePath, 'I am an image');
  });

  afterEach(() => {
    unlinkSync(testFilePath);
  });

  it('converts url to pocket cache URL', async () => {
    expect(
      getPocketCacheUrl('https://sweet-potato.jpg?is_sweet=yes and no'),
    ).toEqual(
      'https://pocket-image-cache.com/x/filters:format(jpeg):quality(100):no_upscale():strip_exif()/https%3A%2F%2Fsweet-potato.jpg%3Fis_sweet%3Dyes%20and%20no',
    );
  });

  it('does not convert pocket-image-cache URLs', async () => {
    expect(
      getPocketCacheUrl('https://pocket-image-cache.com/x/https://banana'),
    ).toEqual('https://pocket-image-cache.com/x/https://banana');
  });
});
