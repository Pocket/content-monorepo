import { mockPocketImageCache } from './testHelpers';
import { validateDatePublished, validateImageUrl } from './validators';

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
      expect(
        await validateImageUrl('https://fake-image-url.com'),
      ).toBeUndefined();
    });

    it('should validate imageUrl', async () => {
      // mock return 200 code
      mockPocketImageCache(200);

      const imageUrl = await validateImageUrl('https://fake-image-url.com');

      // should return  imageUrl
      expect(imageUrl).toEqual('https://fake-image-url.com');
    });
  });

  describe('validateDatePublished', () => {
    it('should return null if a date is not provided', () => {
      const testDate = undefined;

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toBeNull();
    });

    it('should return null if an invalid date is provided', () => {
      const testDate = 'BLIMP';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toBeNull();
    });

    it('should return a formatted date if a Parser-style date is provided', () => {
      const testDate = '2024-01-03 23:48:34';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toEqual('2024-01-03');
    });

    it('should return a formatted date if a Collections-style date is provided', () => {
      const testDate = '2024-04-11';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toEqual('2024-04-11');
    });
  });
});
