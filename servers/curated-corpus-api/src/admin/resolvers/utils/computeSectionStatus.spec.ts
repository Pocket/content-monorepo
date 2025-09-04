import { DateTime } from 'luxon';
import { computeSectionStatus } from './computeSectionStatus';
import { SectionStatus } from '../types';

describe('computeSectionStatus', () => {
  let mockNow: DateTime;

  beforeEach(() => {
    // Mock the current date to 2024-06-15 for consistent testing
    mockNow = DateTime.fromISO('2024-06-15T12:00:00Z', { zone: 'utc' });
    jest.spyOn(DateTime, 'utc').mockReturnValue(mockNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DISABLED status', () => {
    it('should return DISABLED when disabled flag is true, regardless of dates', () => {
      const section = {
        disabled: true,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
    });

    it('should return DISABLED even with future startDate', () => {
      const section = {
        disabled: true,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
    });

    it('should return DISABLED even with past endDate', () => {
      const section = {
        disabled: true,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
    });
  });

  describe('SCHEDULED status', () => {
    it('should return SCHEDULED when startDate is in the future and not disabled', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.SCHEDULED);
    });

    it('should return SCHEDULED for future startDate with no endDate', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-07-01'),
        endDate: null,
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.SCHEDULED);
    });
  });

  describe('EXPIRED status', () => {
    it('should return EXPIRED when currentDate >= endDate', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-06-15'), // Same as current date
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.EXPIRED);
    });

    it('should return EXPIRED when endDate is in the past', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-06-14'), // Day before current date
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.EXPIRED);
    });
  });

  describe('LIVE status', () => {
    it('should return LIVE when startDate <= currentDate < endDate', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });

    it('should return LIVE when startDate <= currentDate and endDate is null', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-06-01'),
        endDate: null,
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });

    it('should return LIVE when startDate is today', () => {
      const section = {
        disabled: false,
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-30'),
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });

    it('should return LIVE for ML sections (no startDate) when not disabled', () => {
      const section = {
        disabled: false,
        startDate: null,
        endDate: null,
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });

    it('should return LIVE for sections without dates when not disabled', () => {
      const section = {
        disabled: false,
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined dates correctly', () => {
      const section = {
        disabled: false,
        startDate: undefined,
        endDate: undefined,
      };

      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });

    it('should handle timezones correctly by normalizing to UTC start of day', () => {
      // Create dates with specific times
      const section = {
        disabled: false,
        startDate: new Date('2024-06-15T23:59:59Z'), // Late on the 15th
        endDate: new Date('2024-06-16T00:00:01Z'), // Early on the 16th
      };

      // Both should be normalized to start of their respective days
      expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
    });
  });
});