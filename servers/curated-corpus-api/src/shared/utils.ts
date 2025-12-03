import { UserInputError } from '@pocket-tools/apollo-utils';
import { ScheduledSurface, ScheduledSurfaces } from 'content-common';
import { ApprovedItem, CorpusItem, CorpusTargetType } from '../database/types';
import { ApprovedItemAuthor } from 'content-common';
import { domainToASCII, parse } from 'url';
import { parse as parseDomain, getDomain } from 'tldts';
import { DateTime } from 'luxon';

/**
 * Generate an integer Epoch time from a JavaScript Date object.
 *
 * @param date
 */
export const getUnixTimestamp = (date: Date): number => {
  return parseInt((date.getTime() / 1000).toFixed(0));
};

/**
 * Returns a function that groups an array of objects by a given property's
 * value.
 *
 * @param array
 * @param key
 */
export function groupBy(array: any[], key: string) {
  const obj = array.reduce((acc, obj) => {
    const property = obj[key];
    acc[property] = acc[property] || [];
    acc[property].push(obj);
    return acc;
  }, {});

  const result: any[] = [];
  for (const key in obj) {
    result.push(obj[key]);
  }

  return result;
}

/**
 * Converts a Date object to a YYYY-MM-DD string (in UTC)
 */
export function toUtcDateString(date: Date) {
  const month = date.getUTCMonth() + 1; // zero-indexed
  const padMonthString = month.toString().padStart(2, '0');
  const padDayString = date.getUTCDate().toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${padMonthString}-${padDayString}`;
}

// Pocket shared data utility constructs/functions

// array for easy access to scheduled surface guids
export const scheduledSurfaceAllowedValues = ScheduledSurfaces.map(
  (surface) => {
    return surface.guid;
  },
);

// array for easy access to scheduled surface access groups
export const scheduledSurfaceAccessGroups = ScheduledSurfaces.map(
  (surface: ScheduledSurface) => {
    return surface.accessGroup;
  },
);

export const getScheduledSurfaceByAccessGroup = (
  group: string,
): ScheduledSurface | undefined => {
  return ScheduledSurfaces.find(
    (surface: ScheduledSurface) => surface.accessGroup === group,
  );
};

export const getScheduledSurfaceByGuid = (
  guid: string,
): ScheduledSurface | undefined => {
  return ScheduledSurfaces.find(
    (surface: ScheduledSurface) => surface.guid === guid,
  );
};

export const getCorpusItemFromApprovedItem = (
  approvedItem: ApprovedItem,
): CorpusItem => {
  const target = getPocketPath(approvedItem.url);

  return {
    id: approvedItem.externalId,
    url: approvedItem.url,
    title: approvedItem.title,
    excerpt: approvedItem.excerpt,
    authors: approvedItem.authors as ApprovedItemAuthor[],
    language: approvedItem.language,
    publisher: approvedItem.publisher,
    imageUrl: approvedItem.imageUrl,
    image: {
      url: approvedItem.imageUrl,
    },
    // so the type definition in /src/database/types has topic as optional,
    // which typescript resolves as `string | undefined`. however, if the
    // topic is missing in the db, prisma returns `null` - hence the
    // nullish coalescing operator below.
    //
    // i wonder why typescript won't accept both. is there some deep dark
    // JS reason? or is it just better practice?
    topic: approvedItem.topic ?? undefined,
    isTimeSensitive: approvedItem.isTimeSensitive,
    target: target?.key && {
      slug: target.key,
      __typename: target.type,
    },
  };
};
// End Pocket shared data utility constructs/functions

const slugRegex = /[\w/]+\/([\w-]+)$/;
const localeRegex = /\/([a-z]{2}(-[A-Z]{2})?)(\/.*)/;

/**
 *
 * @param path
 * @returns [locale, path]
 */
const dropUrlLocalePath = (path: string): [string, string] => {
  const match = path.match(localeRegex);

  if (!match || match.length < 3) {
    return [null, path];
  }

  return [match[1], match[3]];
};

/**
 *
 * @param path without locale.
 * @returns
 */
const getUrlType = (path: string): CorpusTargetType => {
  if (path.startsWith('/explore/item/')) {
    return 'SyndicatedArticle';
  } else if (path.startsWith('/collections/')) {
    return 'Collection';
  }
  return null;
};

export const getUrlId = (path: string): string => {
  return path.match(slugRegex)[1];
};

/**
 *
 * @param url Fully qualified URL.
 * @returns {locale, path, type, key} when URL has a known entity type.
 *          {locale, path} when its a pocket URL but the entities are not known.
 */
export const getPocketPath = (
  url: string,
): {
  locale: string;
  path: string;
  type?: CorpusTargetType;
  key?: string;
} => {
  const obj = parse(url, true);

  // Guard, only process getpocket.com urls.
  if (obj.host != 'getpocket.com') {
    return null;
  }

  // Drop the locale prefix from the path.
  const [locale, path] = dropUrlLocalePath(obj.pathname);
  const type = getUrlType(path);

  if (type == null) {
    return { locale, path };
  }

  const key = getUrlId(path);

  return {
    locale,
    path,
    type,
    key,
  };
};

/**
 * Normalizes a domain string by lowercasing, converting to ASCII (punycode),
 * and stripping the www. prefix.
 *
 * @param hostname A domain name (e.g., "www.Example.com" or "español.example.com")
 * @returns Normalized domain (e.g., "example.com" or "xn--espaol-zwa.example.com")
 */
export const normalizeDomain = (hostname: string): string => {
  let domain = hostname.toLowerCase();
  domain = domainToASCII(domain);
  domain = domain.replace(/^www\./, '');
  return domain;
};

/**
 * Validates a domain name, throwing UserInputError if invalid.
 * Must be a registrable domain or subdomain (not a public suffix, IP, or wildcard).
 *
 * @param domainName A sanitized domain name
 * @throws UserInputError if validation fails
 */
export const validateDomainName = (domainName: string): void => {
  // Normalize to lowercase for consistent validation
  const domain = domainName.toLowerCase();

  // Check length
  if (domain.length === 0) {
    throw new UserInputError('Domain name cannot be empty.');
  }
  if (domain.length > 255) {
    throw new UserInputError('Domain name cannot exceed 255 characters.');
  }

  // Reject URLs with scheme
  if (/^https?:\/\//i.test(domain)) {
    throw new UserInputError(
      'Domain name must be a hostname, not a full URL. Remove the http(s):// prefix.',
    );
  }

  // Reject wildcards
  if (domain.includes('*')) {
    throw new UserInputError('Wildcard domain names are not supported.');
  }

  // Reject localhost
  if (domain === 'localhost' || domain.endsWith('.localhost')) {
    throw new UserInputError('"localhost" is not a valid domain name.');
  }

  // Use tldts to validate
  const parsed = parseDomain(domain);

  // Reject IP addresses
  if (parsed.isIp) {
    throw new UserInputError('IP addresses are not valid domain names.');
  }

  // Reject if not a valid registrable domain or subdomain
  if (!parsed.domain) {
    throw new UserInputError(
      `"${domain}" is not a valid domain name. It must be a registrable domain (e.g., "example.com") or subdomain (e.g., "news.example.com").`,
    );
  }
};

/**
 * Validates that a URL is a valid, secure http or https URL.
 *
 * @param url The URL to validate
 * @throws UserInputError if the URL is invalid, not http(s), has no hostname, or contains credentials
 */
export const validateHttpUrl = (url: string): void => {
  // Reject malformed URLs with missing hostname (e.g., "http:///path")
  // before URL class normalizes them
  if (/^https?:\/\/\//.test(url)) {
    throw new UserInputError('URL does not contain a valid hostname.');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UserInputError(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UserInputError('URL must have http or https scheme.');
  }
  if (!parsed.hostname || parsed.hostname.length === 0) {
    throw new UserInputError('URL does not contain a valid hostname.');
  }
  // Reject URLs with embedded credentials (security risk)
  if (parsed.username || parsed.password) {
    throw new UserInputError('URL must not contain embedded credentials.');
  }
  // Validate the hostname is a proper domain (rejects localhost, IPs, public suffixes, etc.)
  validateDomainName(parsed.hostname);
};

/**
 * Extracts the normalized domain from a URL.
 *
 * @param url A valid URL with a hostname
 * @returns domain including subdomains, except www.
 */
export const getDomainFromUrl = (url: string): string => {
  return normalizeDomain(new URL(url).hostname);
};

/**
 * Extracts the normalized registrable domain (eTLD+1) from a URL.
 * For example, "https://news.example.com" returns "example.com".
 *
 * @param url A valid URL with a hostname
 * @returns Normalized registrable domain (lowercase, punycode)
 * @throws Error if the registrable domain cannot be determined
 */
export const getRegistrableDomainFromUrl = (url: string): string => {
  const domain = getDomain(url);
  if (!domain) {
    throw new Error(`Cannot extract registrable domain from: ${url}`);
  }
  return normalizeDomain(domain);
};

// the below was graciously provided by:
// https://github.com/Pocket/pocket-monorepo/blob/main/servers/list-api/src/dataLoader/utils.ts

// Ensure only an indexible type on the object is used for reordering results,
// and that the key matches
type ReorderMap<T, K extends keyof T> = {
  key: K;
  values: T[K] extends string | number | symbol ? T[K][] : never;
};

/**
 * TODO: if/when we use this in collection api, move this function
 * to the common package
 *
 * Utility function for reordering results. Given a mapping
 * of key name and values by which the result should be ordered,
 * return a reordered list of results.
 * @param reorderMap A mapping of the key (attribute) of the
 * result set to order by, and a list of values by which the
 * result should be ordered
 * @param results results to be reordered
 * @returns results, but ordered to match the order of `values`
 * indexed by `key`.
 */
export function reorderResultByKey<T, K extends keyof T>(
  reorderMap: ReorderMap<T, K>,
  results: T[],
): T[] {
  const resMap = results.reduce((acc, element) => {
    acc[element[reorderMap.key]] = element;
    return acc;
  }, {} as any); // idk... help me with this index type

  return reorderMap.values.map((input) => resMap[input]);
}

/**
 * Convert JS Date → Luxon DateTime in the section's local timezone,
 * treating the JS Date as a plain calendar date (not a UTC timestamp).
 * JS Date months are 0-based (January = 0), but Luxon expects 1-based months.
 * So we must add 1 to `getMonth()` to get the correct calendar month.
 * @param date JS Date object
 * @param timeZone IANA time zone string (e.g., "America/New_York")
 */
export function getLocalDate(date: Date, timeZone: string): DateTime {
  return DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // JS months are 0-based; Luxon expects 1-based
      day: date.getDate(),
    },
    { zone: timeZone },
  ).startOf('day');
}
