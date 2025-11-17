import { parse } from 'tldts';
import { PrismaClient } from '.prisma/client';

import {
  convertParserJsonToUrlMetadata,
  deriveAuthors,
  deriveDatePublished,
  derivePublisher,
} from './lib';
import { getNormalizedDomainFromUrl } from '../../../../shared/utils';
import * as PublisherDomain from '../../../../database/mutations/PublisherDomain';

describe('lib', () => {
  describe('convertParserJsonToUrlMetadata', () => {
    it('should convert fully populated JSON from the metadata parser', () => {
      const parserJson = {
        article: {
          authors: [{ name: 'V.E. Schwab' }],
          datePublishedRaw: '2025-12-01T12:00:09+00:00',
          description:
            'A new adventure set in a beloved world—where old friends and foes alike are faced with a dangerous new threat.',
          mainImage: {
            url: 'https://images/image.jpg',
          },
          inLanguage: 'en',
          headline: 'The Fragile Threads of Power',
          canonicalUrl: 'https://www.veschwab.com/threads',
        },
      };

      const convertedJson = convertParserJsonToUrlMetadata(
        'https://veschwab.com/threads',
        parserJson,
      );

      expect(convertedJson.authors).toEqual(
        deriveAuthors(parserJson.article.authors),
      );
      expect(convertedJson.datePublished).toEqual(
        deriveDatePublished(parserJson.article.datePublishedRaw),
      );
      expect(convertedJson.domain).toEqual(
        parse(parserJson.article.canonicalUrl).domain,
      );
      expect(convertedJson.excerpt).toEqual(parserJson.article.description);
      expect(convertedJson.imageUrl).toEqual(parserJson.article.mainImage.url);
      expect(convertedJson.language).toEqual(
        parserJson.article.inLanguage.toUpperCase(),
      );
      expect(convertedJson.title).toEqual(parserJson.article.headline);
      expect(convertedJson.url).toEqual(parserJson.article.canonicalUrl);
    });

    it('should skip adding properties that cannot be derived from/are missing from the parser JSON', () => {
      const parserJson = {
        article: {
          datePublishedRaw: '2025-12-01T12:00:09+00:00',
          description:
            'A new adventure set in a beloved world—where old friends and foes alike are faced with a dangerous new threat.',
          mainImage: {
            url: 'https://images/image.jpg',
          },
          headline: 'The Fragile Threads of Power',
          canonicalUrl: 'https://www.veschwab.com/threads',
        },
      };

      const convertedJson = convertParserJsonToUrlMetadata(
        'https://veschwab.com/threads',
        parserJson,
      );

      expect(convertedJson.authors).toBeUndefined();
      expect(convertedJson.datePublished).toEqual(
        deriveDatePublished(parserJson.article.datePublishedRaw),
      );
      expect(convertedJson.domain).toEqual(
        parse(parserJson.article.canonicalUrl).domain,
      );
      expect(convertedJson.excerpt).toEqual(parserJson.article.description);
      expect(convertedJson.imageUrl).toEqual(parserJson.article.mainImage.url);
      expect(convertedJson.language).toBeUndefined();
      expect(convertedJson.title).toEqual(parserJson.article.headline);
      expect(convertedJson.url).toEqual(parserJson.article.canonicalUrl);
    });

    it('should fall back to the given URL and domain if the parser JSON is malformed', () => {
      const parserJson = {
        data: {
          datePublishedRaw: '2025-12-01T12:00:09+00:00',
          description:
            'A new adventure set in a beloved world—where old friends and foes alike are faced with a dangerous new threat.',
          mainImage: {
            url: 'https://images/image.jpg',
          },
          headline: 'The Fragile Threads of Power',
          canonicalUrl: 'https://www.veschwab.com/threads',
        },
      };

      const givenUrl = 'https://veschwab.com/threads';

      const convertedJson = convertParserJsonToUrlMetadata(
        givenUrl,
        parserJson,
      );

      expect(convertedJson.authors).toBeUndefined();
      expect(convertedJson.datePublished).toBeUndefined();
      expect(convertedJson.domain).toEqual(parse(givenUrl).domain);
      expect(convertedJson.excerpt).toBeUndefined();
      expect(convertedJson.imageUrl).toBeUndefined();
      expect(convertedJson.language).toBeUndefined();
      expect(convertedJson.title).toBeUndefined();
      expect(convertedJson.url).toEqual(givenUrl);
    });
  });

  describe('deriveAuthors', () => {
    it('should create a CSV string of a single author', () => {
      const author = 'V.E. Schwab';

      const authorArray = [
        {
          name: author,
        },
      ];

      expect(deriveAuthors(authorArray)).toEqual(author);
    });

    it('should create a CSV string of multiple authors', () => {
      const author1 = 'V.E. Schwab';
      const author2 = 'Phillip Pullman';
      const author3 = 'Byung-Chul Han';

      const authorArray = [
        {
          name: author1,
        },
        {
          name: author2,
        },
        {
          name: author3,
        },
      ];

      expect(deriveAuthors(authorArray)).toEqual(
        `${author1},${author2},${author3}`,
      );
    });

    it('should return an empty string if no array was provided', () => {
      expect(deriveAuthors('')).toEqual('');
      expect(deriveAuthors([])).toEqual('');
      expect(deriveAuthors({})).toEqual('');
      expect(deriveAuthors(null)).toEqual('');
      expect(deriveAuthors(undefined)).toEqual('');
      expect(deriveAuthors(42)).toEqual('');
    });

    it('should return an empty string if array is of unexpected format', () => {
      expect(
        deriveAuthors([
          {
            title: 'author',
          },
        ]),
      ).toEqual('');

      expect(deriveAuthors([42, 12])).toEqual('');
    });

    it('should handle partially correct data', () => {
      expect(
        deriveAuthors([
          {
            name: 'V.E. Schwab',
          },
          {
            title: 'Author',
          },
          {
            name: '',
          },
          {
            name: '   ',
          },
        ]),
      ).toEqual('V.E. Schwab');
    });
  });

  describe('deriveDatePublished', () => {
    it('parses a datestring in the expected format', () => {
      expect(deriveDatePublished('2025-12-01T12:00:09+00:00')).toEqual(
        '2025-12-01 12:00:09',
      );
    });

    it('returns undefined if passed a falsy value', () => {
      expect(deriveDatePublished('')).toEqual(undefined);
      expect(deriveDatePublished(null)).toEqual(undefined);
      expect(deriveDatePublished(undefined)).toEqual(undefined);
    });

    it('returns undefined if passed a non-date string value', () => {
      expect(deriveDatePublished('[object Object]')).toEqual(undefined);
      expect(deriveDatePublished(42)).toEqual(undefined);
      expect(deriveDatePublished('i promise i am a date string')).toEqual(
        undefined,
      );
    });
  });

  describe('derivePublisher', () => {
    it('should return a normalized domain name if the publisher was not found in our db', async () => {
      const url = 'https://www.veschwab.com/threads';

      jest
        .spyOn(PublisherDomain, 'lookupPublisher')
        .mockReturnValue(Promise.resolve(null));

      expect(await derivePublisher(null as any as PrismaClient, url)).toEqual(
        getNormalizedDomainFromUrl(url),
      );
    });

    it('should return a publisher if the publisher was found in our db', async () => {
      const url = 'https://www.veschwab.com/threads';

      jest
        .spyOn(PublisherDomain, 'lookupPublisher')
        .mockReturnValue(Promise.resolve('VE Schwab Inc'));

      expect(await derivePublisher(null as any as PrismaClient, url)).toEqual(
        'VE Schwab Inc',
      );
    });
  });
});
