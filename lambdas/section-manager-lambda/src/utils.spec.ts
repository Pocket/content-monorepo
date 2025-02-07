import * as Sentry from '@sentry/serverless';

import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
  UrlMetadata,
} from 'content-common';
import {
  mapAuthorToApprovedItemAuthor,
  mockPocketImageCache,
  validateDatePublished,
} from 'lambda-common';

import { SqsSectionItem } from './types';
import { mapSqsSectionItemToCreateApprovedItemApiInput } from './utils';

describe('utils', () => {
  const sentryCaptureExceptionSpy = jest
    .spyOn(Sentry, 'captureException')
    .mockImplementation();
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
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('mapSqsSectionItemToCreateApprovedItemApiInput', () => {
    it('should default to SQS values if they exist', async () => {
      mockPocketImageCache(200);

      const result = await mapSqsSectionItemToCreateApprovedItemApiInput(
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
      delete sqsSectionItem.excerpt;
      delete sqsSectionItem.image_url;
      delete sqsSectionItem.language;
      delete sqsSectionItem.title;

      // remove preferred Parser values
      delete urlMetadata.authors;

      const result = await mapSqsSectionItemToCreateApprovedItemApiInput(
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
      delete sqsSectionItem.title;
      delete urlMetadata.title;

      await expect(
        mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map ${url} to CreateApprovedCorpusItemApiInput. Reason: Error: Error on assert(): invalid type on $input.title, expect to be string`,
        ),
      );

      expect(sentryCaptureExceptionSpy).toHaveBeenCalledTimes(1);
    });

    /**
     * this test ensures there are no unexpected errors before Typia performs
     * its type validation.
     */
    it('should fail with a Typia error if all optional source data is missing', async () => {
      mockPocketImageCache(200);

      // remove all optional SQS data
      delete sqsSectionItem.authors;
      delete sqsSectionItem.excerpt;
      delete sqsSectionItem.image_url;
      delete sqsSectionItem.language;
      delete sqsSectionItem.title;

      // remove all optional Parser data
      delete urlMetadata.authors;
      delete urlMetadata.excerpt;
      delete urlMetadata.imageUrl;
      delete urlMetadata.language;
      delete urlMetadata.publisher;
      delete urlMetadata.title;

      // jest's way to wait for the async operation below - make sure it
      // knows how many assertions are in this test
      expect.assertions(2);

      try {
        await mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        );
      } catch (error: any) {
        // assert(): lets us know that Typia's `assert` function is where the
        // error occurred, and not prior
        expect(error.message).toContain('Error on assert():');
      }

      expect(sentryCaptureExceptionSpy).toHaveBeenCalledTimes(1);
    });

    /**
     * this test is meant to verify that different formatting is taking place
     * based on the language value. we don't need to re-test the internal
     * functions - just make sure that given different langauge values, we will
     * receive different outputs.
     */
    it('format titles and excerpts for EN and DE only', async () => {
      mockPocketImageCache(200);

      // make sure title and excerpt need formatting for both EN and DE.

      // note - ideally we'd just spy on the internal functions, but there's
      // no easy way (afaik) to do that when importing from an external
      // module.
      sqsSectionItem.title =
        '»a random String to format! random-string:Random!"';
      sqsSectionItem.excerpt = '"»example«';

      sqsSectionItem.language = CorpusLanguage.EN;

      const resultEN = await mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        urlMetadata,
      );

      sqsSectionItem.language = CorpusLanguage.DE;

      const resultDE = await mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        urlMetadata,
      );

      sqsSectionItem.language = CorpusLanguage.ES;

      const resultES = await mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        urlMetadata,
      );

      expect(resultEN.title).not.toEqual(sqsSectionItem.title);
      expect(resultEN.title).not.toEqual(resultDE.title);
      expect(resultEN.title).not.toEqual(resultES.title);

      expect(resultEN.excerpt).not.toEqual(sqsSectionItem.excerpt);
      expect(resultEN.excerpt).not.toEqual(resultDE.excerpt);
      expect(resultEN.excerpt).not.toEqual(resultES.excerpt);
    });

    it('should fail if image validation fails', async () => {
      mockPocketImageCache(500);

      await expect(
        mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          urlMetadata,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map ${url} to CreateApprovedCorpusItemApiInput. Reason: Error: Error on assert(): invalid type on $input.imageUrl, expect to be string`,
        ),
      );

      expect(sentryCaptureExceptionSpy).toHaveBeenCalledTimes(1);
    });
  });
});
