import { mockPocketImageCache } from './testHelpers';
import { validateImageUrl } from './validators';

describe('validators', () => {
  describe('validateImageUrl', () => {
    afterEach(() => {
      // restore global fetch - VERY IMPORTANT! 😅
      jest.restoreAllMocks();
    });

    it('should be null if image is invalid', async () => {
      // mock error response
      mockPocketImageCache(404);

      // should not throw error
      await expect(
        validateImageUrl('https://fake-image-url.com'),
      ).resolves.not.toThrowError();

      // should be undefined & not image_url
      expect(await validateImageUrl('https://fake-image-url.com')).toBeNull();
    });

    it('should validate imageUrl', async () => {
      // mock return 200 code
      mockPocketImageCache(200);

      const imageUrl = await validateImageUrl('https://fake-image-url.com');

      // should return  imageUrl
      expect(imageUrl).toEqual('https://fake-image-url.com');
    });
  });
});
