import {
  validateCandidate,
  validateImageUrl,
  validateScheduledDate,
} from './validation';
import {
    createScheduledCandidate,
    currentMockTimeMondaySaturday,
    currentMockTimeSundayMonday,
    currentMockTimeTuesdaySaturday,
    mockPocketImageCache,
    scheduledDateMonday,
    scheduledDateSaturday,
    scheduledDateSunday
} from './testHelpers';
import {
  CorpusItemSource,
  CorpusLanguage,
  ScheduledSurfacesEnum,
} from 'content-common';
import { DateTime, Settings } from 'luxon';
import config from './config';

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('validation', function () {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  describe.each([
      [
          config.validation.EN_US.timeZone,
          'Monday - Saturday',
          14,
          currentMockTimeMondaySaturday,
          scheduledDateSunday
      ],
      [
          config.validation.DE_DE.timeZone,
          'Tuesday - Saturday',
          14,
          currentMockTimeTuesdaySaturday,
          scheduledDateMonday
      ],
      [
          config.validation.DE_DE.timeZone,
          'Sunday - Monday',
          12,
          currentMockTimeSundayMonday,
          scheduledDateSaturday
      ]
  ])('validateScheduledDate', (timeZone, dayRange, minHours, currentMockTimeDefault, scheduledTimeDefault) => {
      // indicates if a test needs to be run based on condition
      const itif = (condition: boolean) => condition ? it : it.skip;
      it('should throw Error if scheduled date is corrupt & time difference cannot be computed', async () => {
          // set scheduled candidate time to 2023-11-10 12 AM (PST, CET) (Friday)
          // this is an earlier date than the current time, we expect this candidate to fail validation
          // computed time difference is NaN
          const scheduledTime = DateTime.fromObject(
              {
                  year: 2023,
                  month: 11,
                  day: 10,
              },
              {zone: timeZone},
          );
          Settings.now = () => currentMockTimeDefault.toMillis(); // make sure current time is mocked by settings
          const scheduledDate = scheduledTime.toISODate(); // get the schedueld date in YYYY-MM-DD format
          await expect(
              validateScheduledDate(scheduledDate as string, timeZone),
          ).rejects.toThrow(
              'validateScheduledDate: cannot compute the time difference',
          );

          // test for scheduledDate === null, expect to fail
          await expect(
              validateScheduledDate(null as unknown as string, timeZone),
          ).rejects.toThrow(
              'validateScheduledDate: cannot compute the time difference',
          );

          // test for scheduledDate === undefined, expect to fail
          await expect(
              validateScheduledDate(undefined as unknown as string, timeZone),
          ).rejects.toThrow(
              'validateScheduledDate: cannot compute the time difference',
          );
      });
      it(`should throw Error if candidate is scheduled for ${dayRange} less than ${minHours} hrs in advance`, async () => {
          // should try scheduling on Sunday (scheduled for Monday) -> Friday (scheduled for Saturday) (EN_US) hrDiff=13
          // should try scheduling on Monday (scheduled for Tuesday) -> Friday (scheduled for Saturday) (DE_DE) hrDiff=13
          // should try scheduling on Saturday (scheduled for Sunday) -> Sunday (scheduled for Monday) (DE_DE) hrDiff=11
          // expected to fail as min time diff is 14 hours/12 hours
          let currentMockTime = currentMockTimeDefault;
          let scheduledTime = scheduledTimeDefault;
          let range = 7;
          if(timeZone === config.validation.DE_DE.timeZone && minHours === 14) {
              range = 6;
          }
          if(timeZone === config.validation.DE_DE.timeZone && minHours === 12) {
              range = 3;
          }
          for (let i = 1; i < range; i++) {
              currentMockTime = currentMockTime.plus({days: 1}); // add 1 day to the current time
              Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
              scheduledTime = scheduledTime.plus({days: 1}); // add 1 day to the scheduled time
              const scheduledDate = scheduledTime.toISODate(); // get the schedueld date in YYYY-MM-DD format
              await expect(
                  validateScheduledDate(scheduledDate as string, timeZone),
              ).rejects.toThrow(
                  `validateScheduledDate: candidate scheduled for ${dayRange} needs to arrive minimum ${minHours} hours in advance`,
              );
          }
      });
      // EN_US test only
      itif(timeZone === config.validation.EN_US.timeZone)('should throw Error if candidate is scheduled for Sunday less than 32 hrs in advance', async () => {
          // set current time to 2024-01-27 7 AM (PST, CET) (Saturday)
          const currentMockTime = DateTime.fromObject(
              {
                  year: 2024,
                  month: 1,
                  day: 27,
                  hour: 7,
                  minute: 0,
                  second: 0,
              },
              {zone: timeZone},
          );
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          // scheduled date is set to 2024-01-28 (Sunday)
          // 17 hour diff, expected to fail as min time diff is 32 hours
          await expect(validateScheduledDate('2024-01-28', timeZone)).rejects.toThrow(
              'validateScheduledDate: candidate scheduled for Sunday needs to arrive minimum 32 hours in advance',
          );
      });
      // EN_US test only
      itif(timeZone === config.validation.EN_US.timeZone)('should succeed if candidate is scheduled for Sunday at least 32 hours in advance', async () => {
          // set current time to 2024-01-26 4 PM (PST, CET) (Friday)
          const currentMockTime = DateTime.fromObject(
              {
                  year: 2024,
                  month: 1,
                  day: 26,
                  hour: 16,
                  minute: 0,
                  second: 0,
              },
              {zone: timeZone},
          );
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          // scheduled date is set to 2024-01-28 (Sunday)
          // expected to succeed, time diff is exactly 32 hours
          await expect(
              validateScheduledDate('2024-01-28', timeZone),
          ).resolves.not.toThrowError();
      });
      it(`should succeed if candidate is scheduled for ${dayRange} at least ${minHours} hours in advance`, async () => {
          let currentMockTime = currentMockTimeDefault;
          let scheduledTime = scheduledTimeDefault;

          // subtract 1 hour to set current time to 10 AM (exactly 14 hours)
          currentMockTime = currentMockTime.minus({hours: 1});

          let range = 7;
          if(timeZone === config.validation.DE_DE.timeZone && minHours === 14) {
              range = 6;
          }
          if(timeZone === config.validation.DE_DE.timeZone && minHours === 12) {
              range = 3;
          }
          // should try scheduling on Sunday (scheduled for Monday) -> Friday (scheduled for Saturday)
          // expected to succeed, time diff is exactly 14 hours
          for (let i = 1; i < range; i++) {
              currentMockTime = currentMockTime.plus({days: 1}); // add 1 day to the current time
              Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
              scheduledTime = scheduledTime.plus({days: 1}); // add 1 day to the scheduled time
              const scheduledDate = scheduledTime.toISODate(); // get the scheduled date in YYYY-MM-DD format
              await expect(
                  validateScheduledDate(scheduledDate as string, timeZone),
              ).resolves.not.toThrowError();
          }
      });
  });
  describe('validateImageUrl', () => {
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
  describe('validateCandidate', () => {
    it('should not validate a bad scheduled date when enableScheduledDateValidation is false', async () => {
      // mock the config.app.enableScheduledDateValidation
      jest.replaceProperty(config, 'app', {
        name: 'Corpus-Scheduler-Lambda',
        environment: 'test',
        isDev: true,
        sentry: {
          dsn: '',
          release: '',
        },
        allowedToSchedule: 'true',
        enableScheduledDateValidation: 'false',
        version: 'fake-sha',
      });
      const scheduledCandidate = createScheduledCandidate({
        scheduled_date: 'bad-scheduled-date',
      });
      // should not throw error
      await expect(
        validateCandidate(scheduledCandidate),
      ).resolves.not.toThrowError();
    });
    it('should throw Error on ScheduleCandidate if source is not ML', async () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.source =
        CorpusItemSource.MANUAL as CorpusItemSource.ML;

      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.source, expect to be "ML"',
      );
    });
    it('should throw Error on ScheduleCandidate if types are wrong (language)', async () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.language =
        'en' as CorpusLanguage;

      // should throw error
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT" | undefined)',
      );
    });
    it('should throw Error on ScheduleCandidate if types are wrong (scheduled_surface)', async () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.scheduled_surface_guid =
        'bad-surface' as ScheduledSurfacesEnum;

      // should throw error
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.scheduled_surface_guid, expect to be ("NEW_TAB_DE_DE" | "NEW_TAB_EN_GB" | "NEW_TAB_EN_INT" | "NEW_TAB_EN_US" | "NEW_TAB_ES_ES" | "NEW_TAB_FR_FR" | "NEW_TAB_IT_IT" | "POCKET_HITS_DE_DE" | "POCKET_HITS_EN_US" | "SANDBOX")',
      );
    });
    it('should not throw Error on ScheduleCandidate if it validates', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // should not throw error
      await validateCandidate(scheduledCandidate);
    });
  });
});
