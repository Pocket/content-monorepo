import { validateCandidate, validateScheduledDate } from './validation';
import {
  createScheduledCandidate,
  currentMockTimeMondaySaturday,
  currentMockTimeTuesdaySaturday,
  scheduledDateMonday,
  scheduledDateSunday,
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
      config.validation.EN_US.MON_SAT_MIN_DIFF,
      currentMockTimeMondaySaturday,
      scheduledDateSunday,
      3,
    ],
    [
      config.validation.DE_DE.timeZone,
      'Monday - Sunday',
      config.validation.DE_DE.MONDAY_SUNDAY_MIN_DIFF,
      currentMockTimeTuesdaySaturday,
      scheduledDateMonday,
      9,
    ],
  ])(
    'validateScheduledDate',
    (
      timeZone,
      dayRange,
      minHours,
      currentMockTimeDefault,
      scheduledTimeDefault,
      publishHour,
    ) => {
      // indicates if a test needs to be run based on condition
      const itif = (condition: boolean) => (condition ? it : it.skip);
      const isTimeZoneEnUS = timeZone === config.validation.EN_US.timeZone;
      let currentMockTime: DateTime;
      let scheduledTime: DateTime;
      // number of days to iterate thru depending on timeZone and minimum hr diff
      let numberOfDaysRange = 7;
      if (
        timeZone === config.validation.DE_DE.timeZone &&
        minHours === config.validation.EN_US.MON_SAT_MIN_DIFF
      ) {
        numberOfDaysRange = 6;
      }
      beforeEach(() => {
        currentMockTime = currentMockTimeDefault;
        scheduledTime = scheduledTimeDefault;
      });
      it(`should throw Error if scheduled date is corrupt & time difference cannot be computed for ${timeZone} time zone`, () => {
        // set scheduled candidate time to 2023-11-10 12 AM (PST, CET) (Friday)
        // this is an earlier date than the current time, we expect this candidate to fail validation
        // computed time difference is NaN
        const scheduledTime = DateTime.fromObject(
          {
            year: 2023,
            month: 11,
            day: 10,
          },
          { zone: timeZone },
        );
        Settings.now = () => currentMockTimeDefault.toMillis(); // make sure current time is mocked by settings
        const scheduledDate = scheduledTime.toISODate(); // get the schedueld date in YYYY-MM-DD format
        expect(() => {
          validateScheduledDate(scheduledDate as string, timeZone, publishHour);
        }).toThrow(
          `validateScheduledDate (${timeZone}): cannot compute the time difference`,
        );

        // test for scheduledDate === null, expect to fail
        expect(() => {
          validateScheduledDate(
            null as unknown as string,
            timeZone,
            publishHour,
          );
        }).toThrow(
          `validateScheduledDate (${timeZone}): cannot compute the time difference`,
        );

        // test for scheduledDate === undefined, expect to fail
        expect(() => {
          validateScheduledDate(
            undefined as unknown as string,
            timeZone,
            publishHour,
          );
        }).toThrow(
          `validateScheduledDate (${timeZone}): cannot compute the time difference`,
        );
      });
      it(`should throw Error if candidate is scheduled for ${dayRange} less than ${minHours} hrs in advance for ${timeZone} time zone`, () => {
        // should try scheduling on Sunday (scheduled for Monday) -> Friday (scheduled for Saturday) (EN_US) hrDiff=13
        // should try scheduling on Monday (scheduled for Tuesday) -> Friday (scheduled for Saturday) (DE_DE) hrDiff=13
        // expected to fail as min time diff is 14 hours for both time zones
        for (let i = 1; i < numberOfDaysRange; i++) {
          currentMockTime = currentMockTime.plus({ days: 1 }); // add 1 day to the current time
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          scheduledTime = scheduledTime.plus({ days: 1 }); // add 1 day to the scheduled time
          const scheduledDate = scheduledTime.toISODate(); // get the schedueld date in YYYY-MM-DD format

          expect(() => {
            validateScheduledDate(
              scheduledDate as string,
              timeZone,
              publishHour,
            );
          }).toThrow(
            `validateScheduledDate (${timeZone}): candidate scheduled for ${dayRange} needs to arrive minimum ${minHours} hours in advance`,
          );
        }
      });

      // EN_US test only
      itif(isTimeZoneEnUS)(
        `should throw Error if candidate is scheduled for Sunday less than 32 hrs in advance for ${timeZone} time zone`,
        () => {
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
            { zone: timeZone },
          );
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          // scheduled date is set to 2024-01-28 (Sunday)
          // 17 hour diff, expected to fail as min time diff is 32 hours
          expect(() => {
            validateScheduledDate('2024-01-28', timeZone, publishHour);
          }).toThrow(
            `validateScheduledDate (${timeZone}): candidate scheduled for Sunday needs to arrive minimum ${config.validation.EN_US.SUNDAY_MIN_DIFF} hours in advance`,
          );
        },
      );

      // EN_US test only
      itif(isTimeZoneEnUS)(
        `should succeed if candidate is scheduled for Sunday at least ${config.validation.EN_US.SUNDAY_MIN_DIFF} hours in advance for ${timeZone} time zone`,
        () => {
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
            { zone: timeZone },
          );
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          // scheduled date is set to 2024-01-28 (Sunday)
          // expected to succeed, time diff is exactly 32 hours
          expect(() => {
            validateScheduledDate('2024-01-28', timeZone, publishHour);
          }).not.toThrowError();
        },
      );

      it(`should succeed if candidate is scheduled for ${dayRange} at least ${minHours} hours in advance for ${timeZone} time zone`, () => {
        // subtract 1 hour to set current time to 10 AM (exactly 14 hours)
        currentMockTime = currentMockTime.minus({ hours: 1 });
        // should try scheduling on Sunday (scheduled for Monday) -> Friday (scheduled for Saturday)
        // expected to succeed, time diff is exactly 14 hours
        for (let i = 1; i < numberOfDaysRange; i++) {
          currentMockTime = currentMockTime.plus({ days: 1 }); // add 1 day to the current time
          Settings.now = () => currentMockTime.toMillis(); // make sure current time is mocked by settings
          scheduledTime = scheduledTime.plus({ days: 1 }); // add 1 day to the scheduled time
          const scheduledDate = scheduledTime.toISODate(); // get the scheduled date in YYYY-MM-DD format
          expect(() => {
            validateScheduledDate(
              scheduledDate as string,
              timeZone,
              publishHour,
            );
          }).not.toThrowError();
        }
      });
    },
  );

  describe('validateCandidate', () => {
    it('should not validate a bad scheduled date when enableScheduledDateValidation is false', () => {
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
      expect(() => {
        validateCandidate(scheduledCandidate);
      }).not.toThrowError();
    });

    it('should throw Error on ScheduleCandidate if source is not ML', () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.source =
        CorpusItemSource.MANUAL as CorpusItemSource.ML;

      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).toThrow(
        'Error on assert(): invalid type on $input.scheduled_corpus_item.source, expect to be "ML"',
      );
    });

    it('should throw Error on ScheduleCandidate if types are wrong (language)', () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.language =
        'en' as CorpusLanguage;

      // should throw error
      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).toThrow(
        'Error on assert(): invalid type on $input.scheduled_corpus_item.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT" | null)',
      );
    });

    it('should throw Error on ScheduleCandidate if types are wrong (scheduled_surface)', () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.scheduled_surface_guid =
        'bad-surface' as ScheduledSurfacesEnum;

      // should throw error
      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).toThrow(
        'Error on assert(): invalid type on $input.scheduled_corpus_item.scheduled_surface_guid, expect to be ("NEW_TAB_DE_DE" | "NEW_TAB_EN_GB" | "NEW_TAB_EN_INT" | "NEW_TAB_EN_US" | "NEW_TAB_ES_ES" | "NEW_TAB_FR_FR" | "NEW_TAB_IT_IT" | "POCKET_HITS_DE_DE" | "POCKET_HITS_EN_US" | "SANDBOX")',
      );
    });

    // unfortunately, typia's error messages are not consistent, so we need two
    // tests to verify handling of optional properties
    it.each([
      ['excerpt', 'string'],
      ['image_url', 'string'],
      ['title', 'string'],
    ])('should validate optional string properties', (field, type) => {
      const badScheduledCandidate = createScheduledCandidate() as any;

      // null is a valid value from ML
      badScheduledCandidate.scheduled_corpus_item[field] = null;

      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).not.toThrow();

      // undefined is NOT a valid value from ML
      delete badScheduledCandidate.scheduled_corpus_item[field];

      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).toThrow(
        `Error on assert(): invalid type on $input.scheduled_corpus_item.${field}, expect to be (null | ${type})`,
      );
    });

    it.each([
      ['authors', 'Array<string>'],
      ['language', '"DE" | "EN" | "ES" | "FR" | "IT"'],
    ])('should validate optional non-string properties', (field, type) => {
      const badScheduledCandidate = createScheduledCandidate() as any;

      // null is a valid value from ML
      badScheduledCandidate.scheduled_corpus_item[field] = null;

      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).not.toThrow();

      // undefined is NOT a valid value from ML
      delete badScheduledCandidate.scheduled_corpus_item[field];

      expect(() => {
        validateCandidate(badScheduledCandidate);
      }).toThrow(
        `Error on assert(): invalid type on $input.scheduled_corpus_item.${field}, expect to be (${type} | null)`,
      );
    });

    it('should not throw Error on ScheduleCandidate if it validates', () => {
      const scheduledCandidate = createScheduledCandidate();

      // should not throw error
      expect(() => {
        validateCandidate(scheduledCandidate);
      }).not.toThrowError();
    });
  });
});
