import { validateCandidate } from './validation';
import { createScheduledCandidate } from './testHelpers';
import { CorpusItemSource, CorpusLanguage } from 'content-common/types';

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
      const badScheduledCandidate = createScheduledCandidate(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
        'https://fake-image-url.com',
        CorpusLanguage.EN,
        ['Rebecca Jennings'],
        undefined,
        CorpusItemSource.MANUAL as CorpusItemSource.ML,
      );

      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        Error,
      );
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.source, expect to be "ML"',
      );
    });
    it('should throw Error on ScheduleCandidate if types are wrong (language)', async () => {
      const badScheduledCandidate = createScheduledCandidate(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
        'https://fake-image-url.com',
        'en' as CorpusLanguage,
        ['Rebecca Jennings'],
        undefined,
        CorpusItemSource.ML,
      );

      // should throw error
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        Error,
      );
      await expect(validateCandidate(badScheduledCandidate)).rejects.toThrow(
        'Error on typia.assert(): invalid type on $input.scheduled_corpus_item.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT" | undefined)',
      );
    });
    it('should not throw Error on ScheduleCandidate if it validates', async () => {
      const scheduledCandidate = createScheduledCandidate(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
        'https://fake-image-url.com',
        CorpusLanguage.EN,
        ['Rebecca Jennings'],
        undefined,
        CorpusItemSource.ML,
      );

      // should not throw error
      await expect(
        validateCandidate(scheduledCandidate),
      ).resolves.not.toThrowError();
    });
  });
});
