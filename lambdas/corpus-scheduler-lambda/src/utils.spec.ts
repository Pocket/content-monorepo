import { setupServer } from 'msw/node';

import {
  createCreateScheduledItemInput,
  mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput,
} from './utils';

import {
  CorpusItemSource,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  UrlMetadata,
} from 'content-common';
import { mockPocketImageCache } from 'lambda-common';

import {
  createScheduledCandidate,
  defaultScheduledDate,
  getCreateApprovedCorpusItemApiOutput,
  getParserItem,
} from './testHelpers';

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('utils', function () {
  const server = setupServer();

  let expectedCreateApprovedCorpusItemApiOutput: CreateApprovedCorpusItemApiInput;
  let parserItem: UrlMetadata;
  const now = new Date('2021-01-01 10:20:30');

  beforeAll(() => {
    server.listen();

    jest.useFakeTimers({
      now: now,
      advanceTimers: true,
    });
  });

  beforeEach(() => {
    parserItem = getParserItem();

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
      // candidate & parser imageUrl both null
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.image_url =
        null as unknown as string;
      parserItem.imageUrl = null as unknown as string;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
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
          parserItem,
        );

      // check that AP style has been applied
      expect(output.title).not.toEqual(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
      );

      expect(output.title).toEqual(
        'Romantic Norms Are in Flux. No Wonder Everyone’s Obsessed With Polyamory.',
      );

      // validate all other fields
      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & NOT apply title formatting if candidate is not EN', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // force away from EN candidate
      parserItem.language = CorpusLanguage.DE;
      scheduledCandidate.scheduled_corpus_item.language = CorpusLanguage.DE;

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      // update expected values due to lang switches above
      expectedCreateApprovedCorpusItemApiOutput.language = CorpusLanguage.DE;
      expectedCreateApprovedCorpusItemApiOutput.title =
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.';

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply English curly quotes formatting on excerpt if candidate is EN', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.excerpt = `Random "excerpt"`;

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      // curly quotes should be applied
      expectedCreateApprovedCorpusItemApiOutput.excerpt = `Random “excerpt”`;

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply German curly quotes formatting on excerpt if candidate is DE', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.excerpt = `Random "excerpt"`;
      scheduledCandidate.scheduled_corpus_item.language = CorpusLanguage.DE;
      scheduledCandidate.scheduled_corpus_item.title =
        'Romantic norms are in »flux«. No wonder - everyone’s obsessed with «polyamory».';

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      // German quote rules should be applied
      expectedCreateApprovedCorpusItemApiOutput.excerpt = `Random „excerpt”`;
      expectedCreateApprovedCorpusItemApiOutput.language = CorpusLanguage.DE;
      // capitalization for title for German candidates shouldn't change, but German quote formatting applies
      expectedCreateApprovedCorpusItemApiOutput.title =
        'Romantic norms are in „flux”. No wonder – everyone’s obsessed with „polyamory”.';

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & fallback on Parser fields for undefined optional ScheduledCandidate fields', async () => {
      // all optional fields are undefined and should be taken from the Parser
      const scheduledCandidate = createScheduledCandidate({
        title: undefined,
        excerpt: undefined,
        language: undefined,
        authors: undefined,
        image_url: undefined,
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & fallback on Metaflow authors if Parser returns null for authors', async () => {
      const scheduledCandidate = createScheduledCandidate();
      const incompleteParserItem: UrlMetadata = {
        url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
        title:
          'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
        excerpt:
          'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
        language: 'EN',
        publisher: 'POLITICO',
        authors: undefined,
        imageUrl: 'https://fake-image-url.com',
        isCollection: false,
        isSyndicated: false,
      };

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          incompleteParserItem,
        );

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedItemInput & fallback on valid Parser imageUrl if Metaflow imageUrl is not valid', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // force metaflow imageUrl to be null to fallback on Parser
      scheduledCandidate.scheduled_corpus_item.image_url =
        null as unknown as string;

      // set parser.imageUrl
      parserItem.imageUrl = 'https://new-fake-image.com';

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      expectedCreateApprovedCorpusItemApiOutput.imageUrl = parserItem.imageUrl;

      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should map correctly a ScheduledCandidate to CreateApprovedItemInput & fallback on valid Metaflow imageUrl if Parser imageUrl is also present', async () => {
      const scheduledCandidate = createScheduledCandidate();

      // set parser.imageUrl to be sure it's different from scheduledCandidate
      parserItem.imageUrl = 'https://new-fake-image.com';

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );

      expectedCreateApprovedCorpusItemApiOutput.imageUrl = scheduledCandidate
        .scheduled_corpus_item.image_url as string;

      expect(output.imageUrl).toEqual(
        scheduledCandidate.scheduled_corpus_item.image_url,
      );
      expect(output).toEqual(expectedCreateApprovedCorpusItemApiOutput);
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (title)', async () => {
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.title = undefined;
      parserItem.title = undefined;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on assert(): invalid type on $input.title, expect to be string`,
        ),
      );
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (publisher)', async () => {
      const scheduledCandidate = createScheduledCandidate();

      const invalidParserItem: any = {
        ...parserItem,
        publisher: 1,
      };

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          invalidParserItem,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on assert(): invalid type on $input.publisher, expect to be string`,
        ),
      );
    });

    it('should throw Error on CreateApprovedItemInput if field types are wrong (language)', async () => {
      const scheduledCandidate: any = createScheduledCandidate();

      // ZH is not currently a valid CorpusLanguage
      scheduledCandidate.scheduled_corpus_item.language = 'ZH';

      const invalidParserItem: any = {
        ...parserItem,
        language: 'zh',
      };

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          invalidParserItem,
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
