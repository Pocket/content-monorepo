import { ScheduledSurface, ScheduledSurfaces } from 'content-common';
import { ApprovedItem, CorpusItem, CorpusTargetType } from '../database/types';
import { ApprovedItemAuthor } from 'content-common';
import { parse } from 'url';
import { parse as parseDomain } from 'tldts';
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
 * @param url url with http(s) scheme
 * @returns domain name of url including subdomains, except www.
 * @throws an error if the URL does not contain a domain name.
 */
export const getNormalizedDomainName = (url: string): string => {
  const regex = /^https?:\/\/(www\.)?(?<domainName>[^?/:]+)/i;
  const matches = url.match(regex);
  return matches.groups.domainName.toLowerCase();
};

/**
 * Extracts the registrable domain (eTLD+1) from a URL.
 * For example, "news.example.com" returns "example.com".
 *
 * @param url url with http(s) scheme
 * @returns the registrable domain, or null if it cannot be determined
 */
export const getRegistrableDomain = (url: string): string | null => {
  const result = parseDomain(url);
  return result.domain ?? null;
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
    { zone: timeZone }
  ).startOf('day');
}