import { parse } from 'tldts';
import * as Sentry from '@sentry/node';

import config from './config';
import { getUrlMetadata } from './client-api-proxy';
import { ClientApiItem } from './types';
import { UrlMetadata } from 'content-common';

/**
 * helper to convert a JS Date to a unix timestamp. note that this will lose
 * millisecond information (as unix timestamps are seconds based).
 *
 * @param date a Date object
 * @returns a unix timestamp number
 */
export const toUnixTimestamp = (date?: Date): number => {
  date = date || new Date();

  // JS `getTime()` returns milliseconds, while unix timestamp expects seconds
  // this is why we divide by 1000
  return Math.floor(date.getTime() / 1000);
};

/**
 * returns the domain of the original publisher if it's a syndicated article,
 * otherwise returns the domain of the article's original url.
 *
 * @param resolvedUrl string URL of the article
 * @param syndicatedArticleUrl  string URL of the syndicated article
 * @returns string domain name or undefined
 */
export const deriveDomainName = (
  resolvedUrl: string,
  syndicatedArticleUrl?: string,
): string | undefined => {
  const domain = syndicatedArticleUrl
    ? parse(syndicatedArticleUrl).domain
    : parse(resolvedUrl).domain;

  return domain || undefined;
};

/**
 * takes a parser item and, if it's a syndicated article, returns the
 * original publisher (instead of "Pocket"). otherwise, returns the publisher
 * from the domain. returns an empty string if no publisher could be derived.
 *
 * @param item ClientApiItem the raw item from client API
 * @returns string
 */
export const derivePublisher = (item: ClientApiItem): string => {
  let publisher: string;

  if (item.syndicatedArticle?.publisher?.name) {
    publisher = item.syndicatedArticle.publisher.name;
  } else if (item.domainMetadata?.name) {
    publisher = item.domainMetadata.name;
  } else {
    // log to sentry so we can see recommendations without publishers
    Sentry.captureException(
      new Error(
        `No publisher could be derived for resolvedUrl: ${item.resolvedUrl}`,
      ),
    );

    publisher = '';
  }

  return publisher;
};

/**
 * takes a parser item and returns the date it was published, if present
 */
export const deriveDatePublished = (item: ClientApiItem): string => {
  let datePublished: string = '';

  // Collection publication date is not guaranteed by the graph,
  // so let's only use it if it's present
  if (item.collection && item.collection.publishedAt) {
    datePublished = item.collection.publishedAt;
    // If this is a syndicated article, it always has a published date
  } else if (item.syndicatedArticle) {
    datePublished = item.syndicatedArticle.publishedAt;
    // If the parser could retrieve publication date for a story, use that
  } else if (item.datePublished) {
    datePublished = item.datePublished;
  }

  return datePublished;
};

/**
 * creates a CSV of authors from the array returned by client API/parser
 *
 * @param item ClientApiItem - raw item from client API
 * @returns string - a CSV string of all author names, empty if no authors were returned from the Parser
 */
export const deriveAuthors = (item: ClientApiItem): string => {
  let authors = '';

  if (item.syndicatedArticle?.authorNames.length) {
    // if it's a syndicated article and has author names data
    // (syndicated authors data is just an array of name strings)
    authors = item.syndicatedArticle?.authorNames.join(',');
  } else if (item.authors) {
    // if not a syndicated article and has authors data
    // (item authors data is an array of objects, each with a `name` property)
    item.authors.forEach((author) => {
      // make sure we have actual data
      // not checking for alpha only here, as author names could contain really any character
      if (author.name.trim().length) {
        authors = authors.concat(author.name.trim(), ',');
      }
    });

    // remove the trailing comma
    authors = authors.slice(0, -1);
  }

  return authors;
};

/**
 * returns the syndicated excerpt if it exists, otherwise the item's excerpt
 * (result could be undefined - ty parser!)
 *
 * @param item ClientApiItem - raw item from client API
 * @returns string
 */
export const deriveExcerpt = (item: ClientApiItem): string | undefined => {
  return item.syndicatedArticle?.excerpt || item.excerpt;
};

/**
 * returns the syndicated title if it exists, otherwise the item's title
 * (result could be undefined - ty parser!)
 *
 * @param item ClientApiItem - raw item from client API
 * @returns string | undefined
 */
export const deriveTitle = (item: ClientApiItem): string | undefined => {
  return item.syndicatedArticle?.title || item.title;
};

/**
 * returns the syndicated image url if it exists, otherwise the item's image url
 * (result could be undefined - ty parser!)
 *
 * @param item ClientApiItem - raw item from client API
 * @returns string
 */
export const deriveImageUrl = (item: ClientApiItem): string | undefined => {
  return item.syndicatedArticle?.mainImage || item.topImageUrl;
};

/**
 * attempts to retrieve metadata from the parser and, if successful, formats
 * the resulting data to conform to the graph spec.
 *
 * @param url
 * @param retryDelay how long in ms between tries to fetch metadata from the parser. primarily here for running tests.
 * @returns UrlMetadata object
 */
export const deriveUrlMetadata = async (
  url: string,
  retryDelay = config.app.metadataRetryDelay,
): Promise<UrlMetadata> => {
  // get the meta data from the parser
  let item;

  try {
    item = await getUrlMetadata(url, retryDelay);
  } catch (e) {
    Sentry.captureException(e.message, {
      extra: {
        description: 'Failed to retrieve metadata from the parser',
        url: url,
      },
    });
  }

  // return fully populated meta data if metadata is returned from the parser
  if (item) {
    return {
      url: item.resolvedUrl,
      domain: deriveDomainName(
        item.resolvedUrl,
        item?.syndicatedArticle?.publisher?.url,
      ),
      imageUrl: deriveImageUrl(item),
      publisher: derivePublisher(item),
      datePublished: deriveDatePublished(item),
      title: deriveTitle(item),
      excerpt: deriveExcerpt(item),
      language: item.language,
      isSyndicated: !!item.syndicatedArticle?.publisher,
      isCollection: !!item.collection?.slug,
      authors: deriveAuthors(item),
    };
  } else {
    // fallback to return the original url and domain
    return {
      url: url,
      domain: deriveDomainName(url),
    };
  }
};
