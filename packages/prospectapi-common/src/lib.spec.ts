import { toUnixTimestamp } from './lib';

describe('lib', () => {
  describe('toUnixTimestamp', () => {
    it('should convert to a unix timestamp', () => {
      const now = new Date();

      const timestamp = toUnixTimestamp(now);

      const timestampBackToDate = new Date(timestamp * 1000);

      expect(timestampBackToDate.getUTCFullYear()).toEqual(
        now.getUTCFullYear(),
      );
      expect(timestampBackToDate.getUTCMonth()).toEqual(now.getUTCMonth());
      expect(timestampBackToDate.getUTCDate()).toEqual(now.getUTCDate());
      expect(timestampBackToDate.getUTCHours()).toEqual(now.getUTCHours());
      expect(timestampBackToDate.getUTCMinutes()).toEqual(now.getUTCMinutes());
      expect(timestampBackToDate.getUTCSeconds()).toEqual(now.getUTCSeconds());
    });

    it('should give a unix timestamp for now if no date provided', () => {
      const now = new Date();

      const timestamp = toUnixTimestamp();

      const timestampBackToDate = new Date(timestamp * 1000);

      expect(timestampBackToDate.getUTCFullYear()).toEqual(
        now.getUTCFullYear(),
      );
      expect(timestampBackToDate.getUTCMonth()).toEqual(now.getUTCMonth());
      expect(timestampBackToDate.getUTCDate()).toEqual(now.getUTCDate());
      expect(timestampBackToDate.getUTCHours()).toEqual(now.getUTCHours());
      expect(timestampBackToDate.getUTCMinutes()).toEqual(now.getUTCMinutes());
      expect(timestampBackToDate.getUTCSeconds()).toEqual(now.getUTCSeconds());
    });
  });
});
