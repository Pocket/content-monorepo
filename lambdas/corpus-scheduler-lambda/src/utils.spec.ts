import { setupServer } from 'msw/node';

import {
  createCreateScheduledItemInput,
  mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput,
} from './utils';

import {
  CorpusItemSource,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
} from 'content-common';
import { mockPocketImageCache } from 'lambda-common';

import {
  createScheduledCandidate,
  defaultScheduledDate,
  getCreateApprovedCorpusItemApiOutput,
} from './testHelpers';

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('utils', function () {
  const server = setupServer();

  let expectedCreateApprovedCorpusItemApiOutput: CreateApprovedCorpusItemApiInput;
  const now = new Date('2021-01-01 10:20:30');

  beforeAll(() => {
    server.listen();

    jest.useFakeTimers({
      now: now,
      advanceTimers: true,
    });
  });

  beforeEach(() => {
    expectedCreateApprovedCorpusItemApiOutput =
      getCreateApprovedCorpusItemApiOutput();
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('createCreateScheduledItemInput', () => {
    it('should create CreateScheduledItemInput correctly', () => {
      const scheduledCandidate = createScheduledCandidate();
      const output = createCreateScheduledItemInput(
        scheduledCandidate,
        'fake-approved-external-id',
      );
      const expectedApprovedItemOutput = {
        approvedItemExternalId: 'fake-approved-external-id',
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: defaultScheduledDate as string,
        source: 'ML',
      };

      expect(output).toEqual(expectedApprovedItemOutput);
    });

    it('should throw error on CreateScheduledItemInput if a field type is wrong', () => {
      const badCandidate: any = createScheduledCandidate();

      badCandidate.scheduled_corpus_item['source'] =
        'bad-source' as CorpusItemSource.ML;

      expect(() => {
        createCreateScheduledItemInput(
          badCandidate,
          'fake-approved-external-id',
        );
      }).toThrow(
        `failed to create CreateScheduledItemInput for a4b5d99c-4c1b-4d35-bccf-6455c8df07b0. ` +
          `Reason: Error: Error on assert(): invalid type on $input.source, expect to be ("MANUAL" | "ML")`,
      );
    });
  });

  describe('mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });

    beforeAll(() => {
      mockPocketImageCache(200);
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (imageUrl)', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.image_url =
        null as unknown as string;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on assert(): invalid type on $input.imageUrl, expect to be string`,
        ),
      );
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply title formatting if candidate is EN', async () => {
      const scheduledCandidate = createScheduledCandidate();

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      // check that curly quotes have been applied
      expect(output.title).toEqual(
        'Romantic norms are in flux. No wonder everyone\u2019s obsessed with polyamory.',
      );

      // validate all other fields
      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & NOT apply title formatting if candidate is not EN', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // force away from EN candidate
      scheduledCandidate.scheduled_corpus_item.language = CorpusLanguage.DE;

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      // update expected values due to lang switches above
      expectedCreateApprovedCorpusItemApiOutput.language = CorpusLanguage.DE;
      expectedCreateApprovedCorpusItemApiOutput.title =
        'Romantic norms are in flux. No wonder everyone\u2019s obsessed with polyamory.';

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply English curly quotes formatting on excerpt if candidate is EN', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.excerpt = `Random "excerpt"`;

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      // curly quotes should be applied
      expectedCreateApprovedCorpusItemApiOutput.excerpt =
        'Random \u201Cexcerpt\u201D';

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply German curly quotes formatting on excerpt if candidate is DE', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.excerpt = `Random "excerpt"`;
      scheduledCandidate.scheduled_corpus_item.language = CorpusLanguage.DE;
      scheduledCandidate.scheduled_corpus_item.title =
        "Romantic norms are in »flux«. No wonder - everyone's obsessed with «polyamory».";

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      // German quote rules should be applied
      expectedCreateApprovedCorpusItemApiOutput.excerpt =
        'Random \u201Eexcerpt\u201D';
      expectedCreateApprovedCorpusItemApiOutput.language = CorpusLanguage.DE;
      // capitalization for title for German candidates shouldn't change, but German quote formatting applies
      expectedCreateApprovedCorpusItemApiOutput.title =
        "Romantic norms are in \u201Eflux\u201D. No wonder \u2013 everyone's obsessed with \u201Epolyamory\u201D.";

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should use empty array when authors is null', async () => {
      const scheduledCandidate = createScheduledCandidate({
        authors: null,
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      expectedCreateApprovedCorpusItemApiOutput.authors = [];

      expect(output.authors).toEqual([]);
      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should include datePublished when date_published is valid', async () => {
      const scheduledCandidate = createScheduledCandidate({
        date_published: '2024-02-26',
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      expect(output.datePublished).toEqual('2024-02-26');
      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should omit datePublished when date_published is null', async () => {
      const scheduledCandidate = createScheduledCandidate({
        date_published: null,
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      expect(output.datePublished).toBeUndefined();

      // Remove datePublished from expected since it should not be present
      delete expectedCreateApprovedCorpusItemApiOutput.datePublished;

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should log error and omit datePublished when date_published is invalid', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const scheduledCandidate = createScheduledCandidate({
        date_published: 'invalid-date',
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        );

      expect(output.datePublished).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Invalid date_published "invalid-date" for URL ${scheduledCandidate.scheduled_corpus_item.url}; dropping field`,
      );

      // Remove datePublished from expected since it should not be present
      delete expectedCreateApprovedCorpusItemApiOutput.datePublished;

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);

      consoleErrorSpy.mockRestore();
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (title)', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.title = null;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on assert(): invalid type on $input.title, expect to be string`,
        ),
      );
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (language)', async () => {
      const scheduledCandidate: any = createScheduledCandidate();

      // ZH is not currently a valid CorpusLanguage
      scheduledCandidate.scheduled_corpus_item.language = 'ZH';

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on assert(): invalid type on $input.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT")`,
        ),
      );
    });
  });
});
