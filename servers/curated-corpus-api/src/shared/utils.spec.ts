import { CorpusItemSource, CuratedStatus, Topics } from 'content-common';
import { DateTime } from 'luxon';
import { MozillaAccessGroup } from 'content-common';
import {
  getCorpusItemFromApprovedItem,
  getScheduledSurfaceByAccessGroup,
  getScheduledSurfaceByGuid,
  toUtcDateString,
  getPocketPath,
  getDomainFromUrl,
  getRegistrableDomainFromUrl,
  getLocalDate,
  normalizeDomain,
  sanitizeDomainName,
  validateDomainName,
  validateHttpUrl,
} from './utils';
import { ApprovedItem } from '../database/types';

describe('shared/utils', () => {
  // Timezones to test
  const timezones = [
    'UTC',
    'America/New_York',
    'Europe/Berlin',
    'Europe/London',
    'Europe/Paris',
    'Europe/Rome',
    'Europe/Madrid',
    'Asia/Kolkata',
  ];
  describe.each(timezones)('getLocalDate in %s', (tz) => {
    it('should return midnight of the same calendar day in the given timezone', () => {
      const input = new Date('2024-06-15T12:30:56Z'); // noon UTC
      const result = getLocalDate(input, tz);

      const expected = DateTime.fromJSDate(input).setZone(tz).startOf('day');

      expect(result.toISO()).toBe(expected.toISO());
    });
  });
  describe('toUtcDateString', () => {
    it('should convert to YYYY-MM-DD UTC for zero-padded months', async () => {
      const date = new Date(1647042571000); // 2022-03-11 23:49:31 UTC
      expect(toUtcDateString(date)).toEqual('2022-03-11');
    });
    it('should convert to YYYY-MM-DD UTC for two-digit months', async () => {
      const date = new Date(1671032431000); // 2022-12-14 15:40:31 UTC
      expect(toUtcDateString(date)).toEqual('2022-12-14');
    });
    it('should convert to YYYY-MM-DD UTC for zero-padded days', () => {
      const date = new Date(1646162014000); // 2022-03-01 11:13:34 UTC
      expect(toUtcDateString(date)).toEqual('2022-03-01');
    });
  });

  describe('getScheduledSurfaceByAccessGroup', () => {
    it('should return a scheduled surface for a valid access group', () => {
      const result = getScheduledSurfaceByAccessGroup(
        MozillaAccessGroup.NEW_TAB_CURATOR_ENUS,
      );

      expect(result).not.toBeUndefined();

      if (result) {
        expect(result.guid).toBeTruthy();
      }
    });

    it('should return undefined for an invalid access group', () => {
      expect(getScheduledSurfaceByAccessGroup('stone_cutters')).toBeUndefined();
    });

    it('should return undefined for a non-scheduled surface access group', () => {
      expect(
        getScheduledSurfaceByAccessGroup(
          MozillaAccessGroup.COLLECTION_CURATOR_FULL,
        ),
      ).toBeUndefined();
    });
  });

  describe('getScheduledSurfaceByGuid', () => {
    it('should return a scheduled surface for a valid guid', () => {
      const result = getScheduledSurfaceByGuid('NEW_TAB_EN_US');

      expect(result).not.toBeUndefined();

      if (result) {
        expect(result.name).toBeTruthy();
      }
    });

    it('should return undefined for an invalid guid', () => {
      expect(getScheduledSurfaceByGuid('STONE_CUTTERS')).toBeUndefined();
    });
  });

  describe('getCorpusItemFromApprovedItem', () => {
    it('should map an ApprovedItem to a CorpusItem', () => {
      const approvedItem: ApprovedItem = {
        externalId: '123-abc',
        prospectId: 'abc-123',
        url: 'https://test.com',
        domainName: 'test.com',
        status: CuratedStatus.CORPUS,
        id: 123,
        title: 'Test title',
        excerpt: 'An excerpt',
        language: 'EN',
        publisher: 'The Times of Narnia',
        datePublished: null,
        imageUrl: 'https://test.com/image.png',
        topic: Topics.EDUCATION,
        source: CorpusItemSource.PROSPECT,
        isCollection: false,
        isTimeSensitive: false,
        isSyndicated: false,
        createdAt: new Date(),
        createdBy: 'Anyone',
        updatedAt: new Date(),
        updatedBy: null,
        authors: [{ name: 'A.U. Thur', sortOrder: 0 }],
      };

      const result = getCorpusItemFromApprovedItem(approvedItem);

      expect(result).not.toBeUndefined();

      expect(result.id).toEqual(approvedItem.externalId);
      expect(result.url).toEqual(approvedItem.url);
      expect(result.title).toEqual(approvedItem.title);
      expect(result.excerpt).toEqual(approvedItem.excerpt);
      expect(result.authors).toEqual(approvedItem.authors);
      expect(result.language).toEqual(approvedItem.language);
      expect(result.publisher).toEqual(approvedItem.publisher);
      expect(result.imageUrl).toEqual(approvedItem.imageUrl);
      expect(result.topic).toEqual(approvedItem.topic);
      expect(result.isTimeSensitive).toEqual(approvedItem.isTimeSensitive);
    });
  });

  describe('getPocketPath', () => {
    it('matches syndicated articles without locale', () => {
      expect(
        getPocketPath('https://getpocket.com/explore/item/foo-bar'),
      ).toEqual({
        locale: null,
        path: '/explore/item/foo-bar',
        type: 'SyndicatedArticle',
        key: 'foo-bar',
      });
    });
    it('matches syndicated articles with two character locale', () => {
      expect(
        getPocketPath('https://getpocket.com/de/explore/item/foo-bar'),
      ).toEqual({
        locale: 'de',
        path: '/explore/item/foo-bar',
        type: 'SyndicatedArticle',
        key: 'foo-bar',
      });
    });
    it('matches syndicated articles with five character locale', () => {
      expect(
        getPocketPath('https://getpocket.com/en-GB/explore/item/foo-bar'),
      ).toEqual({
        locale: 'en-GB',
        path: '/explore/item/foo-bar',
        type: 'SyndicatedArticle',
        key: 'foo-bar',
      });
    });
    it('matches collections without locale', () => {
      expect(
        getPocketPath('https://getpocket.com/collections/foo-bar'),
      ).toEqual({
        locale: null,
        path: '/collections/foo-bar',
        type: 'Collection',
        key: 'foo-bar',
      });
    });
    it('matches collections articles with two character locale', () => {
      expect(
        getPocketPath('https://getpocket.com/de/collections/foo-bar'),
      ).toEqual({
        locale: 'de',
        path: '/collections/foo-bar',
        type: 'Collection',
        key: 'foo-bar',
      });
    });
    it('matches collections articles with five character locale', () => {
      expect(
        getPocketPath('https://getpocket.com/en-GB/collections/foo-bar'),
      ).toEqual({
        locale: 'en-GB',
        path: '/collections/foo-bar',
        type: 'Collection',
        key: 'foo-bar',
      });
    });
    it('doesnt match other pocket urls', () => {
      expect(getPocketPath('https://getpocket.com/saves')).toEqual({
        locale: null,
        path: '/saves',
      });
      expect(getPocketPath('https://getpocket.com')).toEqual({
        locale: null,
        path: '/',
      });
      expect(getPocketPath('https://other.com')).toBeNull();
    });
  });

  describe('getDomainFromUrl', () => {
    it('should extract domain from a http url', () => {
      const url = 'http://example.com';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should extract domain from a https url', () => {
      const url = 'https://example.com';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle a homograph attack', () => {
      const url = 'http://exаmple.com'; // Note: The 'а' is a Cyrillic character.
      expect(getDomainFromUrl(url)).not.toEqual('example.com');
    });
    it('should correctly remove the www. subdomain', () => {
      const url = 'http://www.example.com';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle mixed case in the domain name', () => {
      const url = 'Https://WwW.ExAmPlE.cOm';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle URLs with many subdomains', () => {
      expect(
        getDomainFromUrl('http://sub.sub2.sub3.example.com'),
      ).toStrictEqual('sub.sub2.sub3.example.com');
    });
    it('should not be tricked by a domain in the path', () => {
      const url = 'http://legit.com/redirect?http://example.com';
      expect(getDomainFromUrl(url)).toStrictEqual('legit.com');
    });
    it('should handle URLs with paths', () => {
      const url = 'http://example.com/path/to/resource';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle query parameters', () => {
      const url = 'http://example.com?query=123';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle ports in the URL', () => {
      const url = 'http://example.com:8080';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should handle international domain names by converting to punycode', () => {
      const url = 'http://münchen.com';
      expect(getDomainFromUrl(url)).toStrictEqual('xn--mnchen-3ya.com');
    });
    it('should extract domain from ftp URLs (no protocol restriction)', () => {
      const url = 'ftp://example.com';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    it('should extract domain from ftp URLs with http in path', () => {
      const url = 'ftp://example.com/http://other.com';
      expect(getDomainFromUrl(url)).toStrictEqual('example.com');
    });
    describe('getDomainFromUrl errors', () => {
      it('should throw an error for empty strings', () => {
        expect(() => getDomainFromUrl('')).toThrow();
      });
      it('should throw an error for invalid URLs', () => {
        expect(() => getDomainFromUrl('not-a-url')).toThrow();
      });
    });
  });

  describe('validateHttpUrl', () => {
    it('should accept valid http URLs', () => {
      expect(() => validateHttpUrl('http://example.com')).not.toThrow();
    });
    it('should accept valid https URLs', () => {
      expect(() =>
        validateHttpUrl('https://example.com/path?query=1'),
      ).not.toThrow();
    });
    it('should reject empty strings', () => {
      expect(() => validateHttpUrl('')).toThrow('Invalid URL');
    });
    it('should reject malformed URLs', () => {
      expect(() => validateHttpUrl('not-a-url')).toThrow('Invalid URL');
    });
    it('should reject ftp URLs', () => {
      expect(() => validateHttpUrl('ftp://example.com')).toThrow(
        'URL must have http or https scheme',
      );
    });
    it('should reject file URLs', () => {
      expect(() => validateHttpUrl('file:///etc/passwd')).toThrow(
        'URL must have http or https scheme',
      );
    });
    it('should reject URLs with triple slash (missing hostname)', () => {
      expect(() => validateHttpUrl('http:///path/without/domain')).toThrow(
        'URL does not contain a valid hostname',
      );
    });
    it('should reject URLs with embedded credentials', () => {
      expect(() => validateHttpUrl('http://user:pass@example.com')).toThrow(
        'URL must not contain embedded credentials',
      );
    });
    it('should reject URLs with username only', () => {
      expect(() => validateHttpUrl('http://user@example.com')).toThrow(
        'URL must not contain embedded credentials',
      );
    });
    it('should reject localhost', () => {
      expect(() => validateHttpUrl('http://localhost/path')).toThrow(
        'localhost is not a valid domain name',
      );
    });
    it('should reject IPv4 addresses', () => {
      expect(() => validateHttpUrl('http://127.0.0.1:8080/path')).toThrow(
        'IP addresses are not valid domain names',
      );
      expect(() => validateHttpUrl('http://8.8.8.8/path')).toThrow(
        'IP addresses are not valid domain names',
      );
    });
    it('should reject IPv6 addresses', () => {
      expect(() => validateHttpUrl('http://[::1]/path')).toThrow(
        'IP addresses are not valid domain names',
      );
    });
  });

  describe('getRegistrableDomainFromUrl', () => {
    it('should extract registrable domain from a simple URL', () => {
      const url = 'https://example.com/path';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.com');
    });

    it('should extract registrable domain from a URL with subdomain', () => {
      const url = 'https://news.example.com/article';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.com');
    });

    it('should extract registrable domain from a URL with multiple subdomains', () => {
      const url = 'https://a.b.c.example.com/path';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.com');
    });

    it('should handle www subdomain', () => {
      const url = 'https://www.example.com/path';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.com');
    });

    it('should handle country-code TLDs', () => {
      const url = 'https://news.example.co.uk/article';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.co.uk');
    });

    it('should handle second-level country-code TLDs', () => {
      const url = 'https://bbc.co.uk/news';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('bbc.co.uk');
    });

    it('should lowercase the domain', () => {
      const url = 'https://NEWS.EXAMPLE.COM/article';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual('example.com');
    });

    it('should convert IDN to punycode', () => {
      const url = 'https://news.münchen.com/article';
      expect(getRegistrableDomainFromUrl(url)).toStrictEqual(
        'xn--mnchen-3ya.com',
      );
    });

    it.each([
      ['not-a-url', 'invalid URL'],
      ['http://localhost:3000', 'localhost'],
      ['http://192.168.1.1/path', 'IP address'],
    ])('should throw an error for %s (%s)', (url) => {
      expect(() => getRegistrableDomainFromUrl(url)).toThrow(Error);
    });
  });

  describe('normalizeDomain', () => {
    it('should lowercase the domain', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toStrictEqual('example.com');
    });

    it('should strip www. prefix', () => {
      expect(normalizeDomain('www.example.com')).toStrictEqual('example.com');
    });

    it('should convert IDN to punycode', () => {
      expect(normalizeDomain('münchen.com')).toStrictEqual(
        'xn--mnchen-3ya.com',
      );
    });

    it('should handle mixed case with www prefix', () => {
      expect(normalizeDomain('WWW.Example.COM')).toStrictEqual('example.com');
    });

    it('should normalize equivalent IDN representations to the same value', () => {
      // español.com in different Unicode representations should normalize to same punycode
      const nfc = 'español.com'; // NFC form (precomposed)
      const nfd = 'español.com'; // NFD form (decomposed) - same visually but different bytes
      expect(normalizeDomain(nfc)).toStrictEqual(normalizeDomain(nfd));
    });

    it('should preserve subdomains', () => {
      expect(normalizeDomain('news.example.com')).toStrictEqual(
        'news.example.com',
      );
    });
  });

  describe('sanitizeDomainName', () => {
    it('should trim whitespace and normalize', () => {
      expect(sanitizeDomainName('  Example.COM  ')).toStrictEqual(
        'example.com',
      );
    });

    it('should handle leading/trailing newlines and tabs', () => {
      expect(sanitizeDomainName('\n\texample.com\t\n')).toStrictEqual(
        'example.com',
      );
    });

    it('should strip www and lowercase after trimming', () => {
      expect(sanitizeDomainName('  WWW.Example.COM  ')).toStrictEqual(
        'example.com',
      );
    });
  });

  describe('validateDomainName', () => {
    describe('valid domains', () => {
      it.each([
        ['example.com', 'simple domain'],
        ['news.example.com', 'subdomain'],
        ['a.b.c.example.com', 'multiple subdomains'],
        ['example.co.uk', 'country-code TLD'],
        ['bbc.co.uk', 'second-level ccTLD'],
        ['xn--mnchen-3ya.com', 'punycode domain'],
      ])('should accept %s (%s)', (domain) => {
        expect(() => validateDomainName(domain)).not.toThrow();
      });
    });

    describe('invalid domains', () => {
      it('should reject empty string', () => {
        expect(() => validateDomainName('')).toThrow(
          'Domain name cannot be empty.',
        );
      });

      it('should reject domains exceeding 255 characters', () => {
        const longDomain = 'a'.repeat(256) + '.com';
        expect(() => validateDomainName(longDomain)).toThrow(
          'Domain name cannot exceed 255 characters.',
        );
      });

      it('should reject URLs with http scheme', () => {
        expect(() => validateDomainName('http://example.com')).toThrow(
          'Domain name must be a hostname, not a full URL.',
        );
      });

      it('should reject URLs with https scheme', () => {
        expect(() => validateDomainName('https://example.com')).toThrow(
          'Domain name must be a hostname, not a full URL.',
        );
      });

      it('should reject wildcard domains', () => {
        expect(() => validateDomainName('*.example.com')).toThrow(
          'Wildcard domain names are not supported.',
        );
      });

      it('should reject IP addresses', () => {
        expect(() => validateDomainName('192.168.1.1')).toThrow(
          'IP addresses are not valid domain names.',
        );
      });

      it('should reject public suffixes (e.g., co.uk)', () => {
        expect(() => validateDomainName('co.uk')).toThrow(
          '"co.uk" is not a valid domain name.',
        );
      });

      it('should reject localhost', () => {
        expect(() => validateDomainName('localhost')).toThrow(
          'localhost is not a valid domain name.',
        );
      });

      it('should reject bare TLDs', () => {
        expect(() => validateDomainName('com')).toThrow(
          '"com" is not a valid domain name.',
        );
      });
    });
  });
});
