import { ScheduledSurface, ScheduledSurfaces } from './types';
import { ApprovedItem, CorpusItem, CorpusTargetType } from '../database/types';
import { ApprovedItemAuthor } from 'content-common';
import { parse } from 'url';

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
  }
);

// array for easy access to scheduled surface access groups
export const scheduledSurfaceAccessGroups = ScheduledSurfaces.map(
  (surface: ScheduledSurface) => {
    return surface.accessGroup;
  }
);

export const getScheduledSurfaceByAccessGroup = (
  group: string
): ScheduledSurface | undefined => {
  return ScheduledSurfaces.find(
    (surface: ScheduledSurface) => surface.accessGroup === group
  );
};

export const getScheduledSurfaceByGuid = (
  guid: string
): ScheduledSurface | undefined => {
  return ScheduledSurfaces.find(
    (surface: ScheduledSurface) => surface.guid === guid
  );
};

export const getCorpusItemFromApprovedItem = (
  approvedItem: ApprovedItem
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
    // topic is missing in the db, prisma returns `null` - h
    // nullish coalescing operator below.
    //
    // i wonder why typescript won't accept both. is there some deep dark
    // JS reason? or is it just better practice?
    topic: approvedItem.topic ?? undefined,
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
  url: string
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
