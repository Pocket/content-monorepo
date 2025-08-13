import * as Sentry from '@sentry/serverless';
import {
  applyApTitleCase,
  CorpusItemSource,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  CuratedStatus,
  formatQuotesEN,
  formatQuotesDashesDE,
  ScheduledSurfacesEnum,
  Topics,
  UrlMetadata,
  IABMetadata,
} from 'content-common';
import {
  mapAuthorToApprovedItemAuthor,
  mockPocketImageCache,
  validateDatePublished,
} from 'lambda-common';

import * as GraphQlApiCalls from './graphQlApiCalls';
import { createSqsSectionWithSectionItems } from './testHelpers';
import {
  CreateOrUpdateSectionApiInput,
  SqsSectionWithSectionItems,
  SqsSectionItem,
} from './types';
import * as Utils from './utils';

describe('utils', () => {
  const url = 'https://science-fiction-reads.com/octavia-and-ursula';

  let sqsSectionItem: SqsSectionItem;
  let urlMetadata: UrlMetadata;

  beforeEach(() => {
    // reset mocked inputs before each test
    sqsSectionItem = {
      authors: ['Octavia E Butler', 'Ursula K Le Guin'],
      excerpt: 'Sqs excerpt',
      image_url: 'https://fake-image.com/sqs-image.jpg',
      language: CorpusLanguage.EN,
      rank: 42,
      source: CorpusItemSource.ML,
      status: CuratedStatus.RECOMMENDATION,
      title: 'Sqs Title',
      topic: Topics.ENTERTAINMENT,
      url,
    };

    urlMetadata = {
      url,
      imageUrl: 'https://fake-image.com/parser-image.jpg',
      publisher: 'Science Fiction Reads',
      datePublished: '2025-02-10 12:00:00',
      domain: 'science-fiction-reads.com',
      title: 'Parser Title',
      excerpt: 'Parser excerpt',
      language: 'en',
      isSyndicated: false,
      isCollection: false,
      authors: 'Margaret Weis,Tracy Hickman',
    };
  });

  afterEach(() => {
    // clear all information/history about mocked functions
    jest.clearAllMocks();
  });

  afterAll(() => {
    // restore original implementation of mocked functions
    jest.restoreAllMocks();
  });

  describe('mapSqsSectionDataToCreateOrUpdateSectionApiInput', () => {
    it('should map an SqsSectionWithSectionItems object to a CreateOrUpdateSectionApiInput object', () => {
      const iabMetadata: IABMetadata = {
        taxonomy: 'IAB-3.0',
        categories: ['488']
      };

      const sqsData: SqsSectionWithSectionItems = {
        active: true,
        candidates: [],
        id: 'test-id',
        scheduled_surface_guid: ScheduledSurfacesEnum.NEW_TAB_DE_DE,
        iab: iabMetadata,
        sort: 42,
        source: CorpusItemSource.ML,
        title: 'test title',
      };

      const apiInput =
        Utils.mapSqsSectionDataToCreateOrUpdateSectionApiInput(sqsData);

      expect(apiInput.active).toEqual(sqsData.active);
      expect(apiInput.createSource).toEqual(sqsData.source);
      expect(apiInput.externalId).toEqual(sqsData.id);
      expect(apiInput.scheduledSurfaceGuid).toEqual(
        sqsData.scheduled_surface_guid,
      );
      expect(apiInput.iab).toEqual(sqsData.iab);
      expect(apiInput.sort).toEqual(sqsData.sort);
      expect(apiInput.title).toEqual(sqsData.title);
    });
  });

  describe('mapSqsSectionItemToCreateApprovedItemApiInput', () => {
    it('should default to SQS values if they exist', async () => {
      mockPocketImageCache(200);

      const result = await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        urlMetadata,
      );

      // uses SQS values (where available)
      const expected = {
        // Parser authors are preferred at this time
        authors: mapAuthorToApprovedItemAuthor(
          (urlMetadata.authors as string).split(','),
        ),
        excerpt: sqsSectionItem.excerpt,
        imageUrl: sqsSectionItem.image_url,
        isCollection: false,
        isSyndicated: false,
        isTimeSensitive: false,
        language: sqsSectionItem.language,
        // only available from the Parser at this time
        publisher: urlMetadata.publisher,
        source: sqsSectionItem.source.toString(),
        status: sqsSectionItem.status.toString(),
        title: sqsSectionItem.title,
        topic: sqsSectionItem.topic.toString(),
        url,
        // only available from the Parser at this time
        datePublished: validateDatePublished(urlMetadata.datePublished),
      };

      expect(result).toEqual(expected);
    });

    it('should use fall back values as expected', async () => {
      mockPocketImageCache(200);

      // remove preferred SQS values
      sqsSectionItem.excerpt = null;
      sqsSectionItem.image_url = null;
      sqsSectionItem.language = null;
      sqsSectionItem.title = null;

      // remove preferred Parser values
      delete urlMetadata.authors;

      const result = await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        urlMetadata,
      );

      const expected = {
        // falls back to SQS
        authors: mapAuthorToApprovedItemAuthor(
          sqsSectionItem.authors as string[],
        ),
        excerpt: urlMetadata.excerpt, // falls back to Parser
        imageUrl: urlMetadata.imageUrl, // falls back to Parser
        isCollection: false,
        isSyndicated: false,
        isTimeSensitive: false,
        language: urlMetadata.language?.toUpperCase(), // falls back to Parser
        publisher: urlMetadata.publisher,
        // required in SQS data
        source: sqsSectionItem.source.toString(),
        // required in SQS data
        status: sqsSectionItem.status.toString(),
        title: urlMetadata.title, // falls back to Parser
        // required in SQS data
        topic: sqsSectionItem.topic.toString(),
        url,
        datePublished: validateDatePublished(urlMetadata.datePublished),
      };

      expect(result).toEqual(expected);
    });

    /**
     * this test is just a sanity check that the Typia library is doing
     * what we expect it to do - erroring if data does not conform to the
     * expected type.
     */
    it('should fail if neither SQS nor the Parser have required data', async () => {
      mockPocketImageCache(200);

      // remove title from both sources
      sqsSectionItem.title = null;
      delete urlMetadata.title;

      await expect(
        Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        ),
      ).rejects.toThrow(
        new Error(
          `Error on assert(): invalid type on $input.title, expect to be string`,
        ),
      );
    });

    /**
     * this test ensures there are no unexpected errors before Typia performs
     * its type validation.
     */
    it('should fail with a Typia error if all optional source data is missing', async () => {
      mockPocketImageCache(200);

      // remove all optional SQS data
      sqsSectionItem.authors = null;
      sqsSectionItem.excerpt = null;
      sqsSectionItem.image_url = null;
      sqsSectionItem.language = null;
      sqsSectionItem.title = null;

      // remove all optional Parser data
      delete urlMetadata.authors;
      delete urlMetadata.excerpt;
      delete urlMetadata.imageUrl;
      delete urlMetadata.language;
      delete urlMetadata.publisher;
      delete urlMetadata.title;

      // jest's way to wait for the async operation below - make sure it
      // knows how many assertions are in this test
      expect.assertions(1);

      try {
        await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        );
      } catch (error: any) {
        // assert(): lets us know that Typia's `assert` function is where the
        // error occurred, and not prior
        expect(error.message).toContain('Error on assert():');
      }
    });

    describe('formatting titles and excerpts', () => {
      beforeEach(() => {
        mockPocketImageCache(200);

        // note - ideally we'd just spy on the internal functions, but there's
        // no easy way (afaik) to do that when importing from an external
        // module.

        // make sure title and excerpt need formatting for both EN and DE.
        sqsSectionItem.title =
          '»a random String to format! random-string:Random!"';
        sqsSectionItem.excerpt = '"»example«';
      });

      it('format titles and excerpts for EN', async () => {
        sqsSectionItem.language = CorpusLanguage.EN;

        const result =
          await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
            sqsSectionItem,
            urlMetadata,
          );

        expect(result.title).toEqual(
          formatQuotesEN(applyApTitleCase(sqsSectionItem.title as string)),
        );
        expect(result.excerpt).toEqual(
          formatQuotesEN(sqsSectionItem.excerpt as string),
        );
      });

      it('format titles and excerpts for DE', async () => {
        sqsSectionItem.language = CorpusLanguage.DE;

        const result =
          await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
            sqsSectionItem,
            urlMetadata,
          );

        expect(result.title).toEqual(
          formatQuotesDashesDE(sqsSectionItem.title as string),
        );
        expect(result.excerpt).toEqual(
          formatQuotesDashesDE(sqsSectionItem.excerpt as string),
        );
      });

      it('does not format titles and excerpts for languages other than EN and DE', async () => {
        sqsSectionItem.language = CorpusLanguage.ES;

        const result =
          await Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
            sqsSectionItem,
            urlMetadata,
          );

        expect(result.title).toEqual(sqsSectionItem.title as string);
        expect(result.excerpt).toEqual(sqsSectionItem.excerpt as string);
      });
    });

    it('should fail if image validation fails', async () => {
      mockPocketImageCache(500);

      await expect(
        Utils.mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        ),
      ).rejects.toThrow(
        new Error(
          `Error on assert(): invalid type on $input.imageUrl, expect to be string`,
        ),
      );
    });
  });

  describe('processSqsSectionData', () => {
    const sectionItemCount = 3;
    // create a payload with a section and 3 section items
    const sqsSectionData = createSqsSectionWithSectionItems(
      {},
      sectionItemCount,
    );
    // ensure each candidate URL is unique to test de-dupe logic
    sqsSectionData.candidates = sqsSectionData.candidates.map((candidate, i) => ({
      ...candidate,
      url: `https://example-${i}.com`,
    }));
    const jwtBearerToken = 'testJwtBearerToken';

    // mock all the functions orchestrated by processSqsSectionData.
    // this is just to test call count.
    let mockMapSqsSectionDataToCreateOrUpdateSectionApiInput: any;
    let mockCreateOrUpdateSection: any;
    let mockGetUrlMetadata: any;
    let mockMapSqsSectionItemToCreateApprovedItemApiInput: any;
    let mockCreateApprovedCorpusItem: any;
    let mockCreateSectionItem: any;

    const sentryStub: jest.SpyInstance = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation(() => '');

    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    afterEach(() => {
      // clear all information/history about mocked functions
      jest.clearAllMocks();
    });

    afterAll(() => {
      // restore original implementation of mocked functions
      jest.restoreAllMocks();
    });

    beforeEach(() => {
      mockMapSqsSectionDataToCreateOrUpdateSectionApiInput = jest
        .spyOn(Utils, 'mapSqsSectionDataToCreateOrUpdateSectionApiInput')
        .mockReturnValue({} as CreateOrUpdateSectionApiInput);

      mockCreateOrUpdateSection = jest
        .spyOn(GraphQlApiCalls, 'createOrUpdateSection')
        .mockResolvedValue({externalId: 'sectionExternalId1', sectionItems: []});

      mockGetUrlMetadata = jest
        .spyOn(GraphQlApiCalls, 'getUrlMetadata')
        .mockResolvedValue({} as UrlMetadata);

      mockMapSqsSectionItemToCreateApprovedItemApiInput = jest
        .spyOn(Utils, 'mapSqsSectionItemToCreateApprovedItemApiInput')
        .mockResolvedValue({} as CreateApprovedCorpusItemApiInput);

      mockCreateApprovedCorpusItem = jest
        .spyOn(GraphQlApiCalls, 'createApprovedCorpusItem')
        .mockResolvedValue('approvedItemExternalId2');

      mockCreateSectionItem = jest
        .spyOn(GraphQlApiCalls, 'createSectionItem')
        .mockResolvedValue('sectionItemExternalId1');
    });

    it('returns sectionItems from createOrUpdateSection when updating section', async () => {
      const mockSectionItems = [
        {
          externalId: 'sectionItemExternalId1',
          approvedItem: {
            externalId: 'approvedItemExternalId1',
            url: 'https://example-one.com',
          },
        },
        {
          externalId: 'sectionItemExternalId2',
          approvedItem: {
            externalId: 'approvedItemExternalId2',
            url: 'https://example-two.com',
          },
        },
      ];

      mockCreateOrUpdateSection.mockResolvedValue({
        externalId: 'sectionExternalId1',
        sectionItems: mockSectionItems,
      });

      await Utils.processSqsSectionData(sqsSectionData, jwtBearerToken);

      expect(mockCreateOrUpdateSection).toHaveBeenCalledTimes(1);
      const sectionResponse = await mockCreateOrUpdateSection.mock.results[0].value;

      expect(sectionResponse.externalId).toEqual('sectionExternalId1')
      // check sectionItems are returned in response
      expect(sectionResponse.sectionItems).toEqual(mockSectionItems);
    });

    it('calls the expected functions if the section items already exist in the corpus', async () => {
      // make sure all the section items "exist" in the corpus
      const mockGetApprovedCorpusItemByUrl = jest
        .spyOn(GraphQlApiCalls, 'getApprovedCorpusItemByUrl')
        .mockResolvedValue({
          externalId: 'approvedItemExternalId1',
          url: 'test.com',
        });


      await Utils.processSqsSectionData(sqsSectionData, jwtBearerToken);

      expect(
        mockMapSqsSectionDataToCreateOrUpdateSectionApiInput,
      ).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpdateSection).toHaveBeenCalledTimes(1);

      // this should be called once for each section item in the payload
      expect(mockGetApprovedCorpusItemByUrl).toHaveBeenCalledTimes(
        sectionItemCount,
      );

      // we are mocking getApprovedCorpusItemByUrl to return a value,
      // meaning it already exists in the corpus, so we shouldn't be getting
      // URL metadata from the parser or creating a new approved item.
      expect(mockGetUrlMetadata).not.toHaveBeenCalled();
      expect(
        mockMapSqsSectionItemToCreateApprovedItemApiInput,
      ).not.toHaveBeenCalled();
      expect(mockCreateApprovedCorpusItem).not.toHaveBeenCalled();

      expect(mockCreateSectionItem).toHaveBeenCalledTimes(sectionItemCount);

      // Check that all 3 candidates processed, 0 failures
      expect(sentryStub).toHaveBeenCalledTimes(0);
      expect(mockConsoleError).toHaveBeenCalledTimes(0);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog.mock.calls[0][0]).toContain(
        `No SectionItems to remove for Section sectionExternalId1`,
      );
      expect(mockConsoleLog.mock.calls[1][0]).toContain(
        'processSqsSectionData result: 3 succeeded, 0 failed',
      );
    });

    it('calls the expected functions if the section items do not exist in the corpus', async () => {
      // make sure none of the section items "exist" in the corpus
      const mockGetApprovedCorpusItemByUrl = jest
        .spyOn(GraphQlApiCalls, 'getApprovedCorpusItemByUrl')
        .mockResolvedValue(null);

      await Utils.processSqsSectionData(sqsSectionData, jwtBearerToken);

      expect(
        mockMapSqsSectionDataToCreateOrUpdateSectionApiInput,
      ).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpdateSection).toHaveBeenCalledTimes(1);

      // this should be called once for each section item in the payload
      expect(mockGetApprovedCorpusItemByUrl).toHaveBeenCalledTimes(
        sectionItemCount,
      );

      // we are mocking getApprovedCorpusItemByUrl to return null, meaning
      // meaning it doesn't exist in the corpus, so we should be getting
      // URL metadata from the parser and creating a new approved item.
      expect(mockGetUrlMetadata).toHaveBeenCalledTimes(sectionItemCount);
      expect(
        mockMapSqsSectionItemToCreateApprovedItemApiInput,
      ).toHaveBeenCalledTimes(sectionItemCount);
      expect(mockCreateApprovedCorpusItem).toHaveBeenCalledTimes(
        sectionItemCount,
      );
      expect(mockCreateSectionItem).toHaveBeenCalledTimes(sectionItemCount);

      // Check that all 3 candidates processed, 0 failures
      expect(sentryStub).toHaveBeenCalledTimes(0);
      expect(mockConsoleError).toHaveBeenCalledTimes(0);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog.mock.calls[0][0]).toContain(
        `No SectionItems to remove for Section sectionExternalId1`,
      );
      expect(mockConsoleLog.mock.calls[1][0]).toContain(
        'processSqsSectionData result: 3 succeeded, 0 failed',
      );
    });

    it('continues processing other candidates even if one fails', async () => {
      // Mock getApprovedCorpusItemByUrl
      const mockGetApprovedCorpusItemByUrl = jest
        .spyOn(GraphQlApiCalls, 'getApprovedCorpusItemByUrl')
        .mockImplementation(async (_endpoint, _headers, url) => {
          if (url.includes('fail-url')) {
            throw new Error('Simulated candidate failure');
          }
          return { externalId: 'approvedItemExternalId1', url };
        });

      // Update sqsSectionData to include one "bad" URL
      sqsSectionData.candidates[1].url = 'https://fail-url.com';

      // 3 candidates total, one "bad" candidate
      await Utils.processSqsSectionData(sqsSectionData, jwtBearerToken);

      // getApprovedCorpusItemByUrl is called once per candidate
      expect(mockGetApprovedCorpusItemByUrl).toHaveBeenCalledTimes(
        sectionItemCount,
      );

      // A sectionItem should be created for the two candidates that have succeeded
      expect(mockCreateSectionItem).toHaveBeenCalledTimes(
        sectionItemCount - 1,
      );

      // Check that console.error & Sentry were called
      expect(sentryStub).toHaveBeenCalledTimes(1);
      expect(sentryStub.mock.calls[0][0].message).toContain(
        `Simulated candidate failure`,
      );
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError.mock.calls[0][0]).toContain(
        'Failed to process SectionItem candidate for URL https://fail-url.com: ',
      );
      expect(mockConsoleError.mock.calls[0][1].message).toContain(
        'Simulated candidate failure',
      );

      // Check that 2 candidates were processed & 1 failed
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog.mock.calls[0][0]).toContain(
        `No SectionItems to remove for Section sectionExternalId1`,
      );
      expect(mockConsoleLog.mock.calls[1][0]).toContain(
        'processSqsSectionData result: 2 succeeded, 1 failed',
      );
    });

    it('calls the expected functions when creating ML SectionItems first, ignoring dupes, then removing old SectionItems, with deactivateSource=ML', async () => {
      const url1 = 'https://example-one.com';
      const url2 = 'https://example-two.com';
      const url3 = 'https://example-three.com';

      // Existing Section (to update) already has SectionItems with URLS 1 & 2
      mockCreateOrUpdateSection.mockResolvedValue({
        externalId: 'sectionExternalId1',
        sectionItems: [
          {
            externalId: 'sectionItem1',
            approvedItem: { externalId: 'approvedItem1', url: url1 },
          },
          {
            externalId: 'sectionItem2',
            approvedItem: { externalId: 'approvedItem2', url: url2 },
          },
        ],
      });

      // ML sends SectionItem payload with URL2 (already active) + URL3 (new)
      const sqs = createSqsSectionWithSectionItems({}, 0);
      sqs.candidates = [
        { url: url2, rank: 1 } as any,
        { url: url3, rank: 2 } as any,
      ];

      // Mock ApprovedItem lookup
      jest.spyOn(GraphQlApiCalls, 'getApprovedCorpusItemByUrl')
        .mockImplementation(async (_endpoint, _headers, url) => {
          if (url === url2) return { externalId: 'approvedItem2', url: url2 };
          if (url === url3) return { externalId: 'approvedItem3', url: url3 };
          return null;
        });

      const mockRemoveSectionItem = jest
        .spyOn(GraphQlApiCalls, 'removeSectionItem')
        .mockResolvedValue('sectionItem1');

      await Utils.processSqsSectionData(sqs, jwtBearerToken);

      // Only create SectionItem with URL3 (SectionItem with URL2 is already active (dupe))
      expect(mockCreateSectionItem).toHaveBeenCalledTimes(1);
      expect(mockCreateSectionItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          approvedItemExternalId: 'approvedItem3',
          rank: 2,
        }),
      );

      // Only remove SectionItem with URL1
      expect(mockRemoveSectionItem).toHaveBeenCalledTimes(1);
      expect(mockRemoveSectionItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          externalId: 'sectionItem1',
          deactivateSource: 'ML',
        }),
      );
    });
  });
});
