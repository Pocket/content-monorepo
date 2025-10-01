import { DateTime } from 'luxon';
import { computeSectionStatus } from './SectionStatus';
import { SectionStatus } from '../../types';

const testSurfacesTimeZones = [
  { guid: 'NEW_TAB_EN_US',   timezone: 'America/New_York' },
  { guid: 'NEW_TAB_DE_DE',   timezone: 'Europe/Berlin' },
  { guid: 'NEW_TAB_EN_GB',   timezone: 'Europe/London' },
  { guid: 'NEW_TAB_FR_FR',   timezone: 'Europe/Paris' },
  { guid: 'NEW_TAB_IT_IT',   timezone: 'Europe/Rome' },
  { guid: 'NEW_TAB_ES_ES',   timezone: 'Europe/Madrid' },
  { guid: 'NEW_TAB_EN_INTL', timezone: 'Asia/Kolkata' },
];
describe.each(testSurfacesTimeZones)(
  'computeSectionStatus – %s',
  ({ guid, timezone }) => {

    beforeEach(() => {
      const mockNowLocal = DateTime.fromISO('2024-06-15T00:00:00', { zone: timezone }).startOf('day');
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNowLocal);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('DISABLED status', () => {
      it('should return DISABLED when disabled flag is true, regardless of dates', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: true,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
      });

      it('should return DISABLED even with future startDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: true,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-31'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
      });

      it('should return DISABLED even with past endDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: true,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-05-31'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.DISABLED);
      });
    });

    describe('SCHEDULED status', () => {
      it('should return SCHEDULED when startDate is the next day after currentDate and not disabled', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-16'),
          endDate: new Date('2024-07-31'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.SCHEDULED);
      });

      it('should return SCHEDULED when startDate is in the future and not disabled', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-31'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.SCHEDULED);
      });

      it('should return SCHEDULED for future startDate with no endDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
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
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-06-14'), // Same as current date
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.EXPIRED);
      });

      it('should return EXPIRED when endDate is in the past', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-06-14'), // Day before current date
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.EXPIRED);
      });

      it('should return EXPIRED when endDate is right before the currentDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-14'),
          endDate: new Date('2024-06-12'), // Day before current date
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.EXPIRED);
      });
    });

    describe('LIVE status', () => {
      it('should return LIVE when startDate <= currentDate < endDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE when startDate <= currentDate and endDate is null', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-01'),
          endDate: null,
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE when startDate is today', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-15'),
          endDate: new Date('2024-06-30'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE for ML sections (no startDate) when not disabled', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: null,
          endDate: null,
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE for sections without dates when not disabled', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });
    });

    describe('edge cases', () => {
      it('should handle undefined dates correctly', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: undefined,
          endDate: undefined,
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE when current local day is within start and end date range', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-15T00:00:00Z'),
          endDate: new Date('2024-06-16T00:00:00Z'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });

      it('should return LIVE when startDate and endDate are the same and match currentDate', () => {
        const section = {
          scheduledSurfaceGuid: guid,
          disabled: false,
          startDate: new Date('2024-06-15T00:00:00-04:00'),
          endDate: new Date('2024-06-15T00:00:00-04:00'),
        };

        expect(computeSectionStatus(section)).toBe(SectionStatus.LIVE);
      });
    });
  });