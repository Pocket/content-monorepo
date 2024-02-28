import { validateCandidate } from './validation';
import { createScheduledCandidate } from './testHelpers';
import { CorpusItemSource, CorpusLanguage } from 'content-common';

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('validation', function () {
  const now = new Date('2021-01-01 10:20:30');

  beforeAll(() => {
    jest.useFakeTimers({
      now: now,
      advanceTimers: true,
    });
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  describe('validateCandidate', () => {
    it('should throw Error on ScheduleCandidate if source is not ML', async () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.source =
        CorpusItemSource.MANUAL as CorpusItemSource.ML;

      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        new Error(
          'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.source, expect to be "ML"',
        ),
      );
    });
    it('should throw Error on ScheduleCandidate if types are wrong (language)', async () => {
      const badScheduledCandidate = createScheduledCandidate();
      badScheduledCandidate.scheduled_corpus_item.language =
        'en' as CorpusLanguage;

      // should throw error
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        new Error(
          'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT" | undefined)',
        ),
      );
    });
    it('should not throw Error on ScheduleCandidate if it validates', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // should not throw error
      await validateCandidate(scheduledCandidate);
    });
  });
});
