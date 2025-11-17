import { PrismaClient } from '.prisma/client';
import * as Sentry from '@sentry/node';
import { parse } from 'tldts';

import { UrlMetadata } from 'content-common';

import config from '../../../../config';
import { getNormalizedDomainFromUrl } from '../../../../shared/utils';
import { lookupPublisher } from '../../../../database/mutations/PublisherDomain';

/**
 * creates a CSV of authors from the array returned by the metadata parser
 *
 * @param authorArray array of objects with at least a `name` property - or
 *  any other value returned from the external metadata parser (empty string,
 *  null, undefined, etc)
 *  happy path author array from zyte looks like:
 *  [ { name: 'Kyle Orland', nameRaw: 'Kyle Orland' } ]
 * @returns string - a CSV string of all author names, empty string if no
 *  authors were returned from the metadata parser
 */
export const deriveAuthors = (
  authorArray: { [key: string]: any } | any,
): string => {
  let authors = '';

  if (authorArray && Array.isArray(authorArray)) {
    authorArray.forEach((author) => {
      // make sure we have actual data
      // not checking for alpha only here, as author names could contain really any character
      if (author.name && author.name.trim().length) {
        authors = authors.concat(author.name.trim(), ',');
      }
    });

    // remove the trailing comma
    authors = authors.slice(0, -1);
  }

  return authors;
};

/**
 *
 * @param dateRaw expects a datestring like '2025-12-01T12:00:09+00:00', but
 *  value is coming from external source, so could be anything
 * @returns formatted date string, or undefined
 */
export const deriveDatePublished = (dateRaw: any): string | undefined => {
  let formattedDate;

  if (dateRaw) {
    try {
      const date = new Date(dateRaw);

      // calling new Date() with a non-date string value will not throw, but
      // it will result in the toString() method returning 'Invalid Date'

      // calling new Date() with a number may or may not work - let's make sure
      // it's a number that results in the non-default JS date year.
      if (date.toString() !== 'Invalid Date' && date.getFullYear() !== 1970) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');

        formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
    } catch (e) {
      formattedDate = undefined;
    }

    return formattedDate;
  }
};

/**
 * looks for a publisher name mapping to domain in our internal db. if found,
 * returns that. if not, returns the normalized domain name.
 *
 * @param db PrismaClient
 * @param url URL for which to look up the publisher
 * @returns string publisher name, or normalized domain name
 */
export const derivePublisher = async (
  db: PrismaClient,
  url: string,
): Promise<string> => {
  const domainName = getNormalizedDomainFromUrl(url);

  // look up the publisher value from our internal mapping
  const publisher = await lookupPublisher(db, url);

  return publisher ?? domainName;
};

/**
 * use node fetch to hit the external metadata parser.
 *
 * broken out into a standalone function for easier mocking in tests.
 *
 * @param url URL for which to fetch metadata
 * @param metadataParserEnpointUrl URL endpoint of the metadata service
 * @param metadataParserApiKey API key for the metadata service
 * @returns JSON from the metadata service, or an empty object on failure
 */
export const fetchUrlMetadata = async (
  url: string,
  metadataParserEnpointUrl: string,
  metadataParserApiKey: string,
): Promise<{ [key: string]: any }> => {
  // Zyte-specific implementation
  try {
    const response = await fetch(metadataParserEnpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          metadataParserApiKey + ':',
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        url: url,
        article: true,
        articleOptions: {
          extractFrom: 'browserHtml',
        },
        tags: {
          environment: config.app.environment,
          service: config.app.serviceName,
        },
      }),
    });

    return await response.json();
  } catch (e) {
    Sentry.captureException(
      new Error(`Metadata parser failed to return metadata for ${url}`),
    );

    // gracefully return empty object when external metadata parser fails
    return {};
  }
};

/**
 * converts JSON metadata returned from the metadata service to the format
 * needed for the graph return value
 *
 * @param originalUrl URL provided by the calling service
 * @param metadataJson JSON provided by the metadata service
 * @returns UrlMetadata object
 */
export const convertParserJsonToUrlMetadata = (
  originalUrl: string,
  metadataJson: {
    [key: string]: any;
  },
): UrlMetadata => {
  let authors: string;
  let datePublished: string;
  let domain: string;
  let excerpt: string;
  let imageUrl: string;
  let language: string;
  let title: string;
  let url: string;

  try {
    const article = metadataJson.article;

    authors = deriveAuthors(article.authors);
    datePublished = deriveDatePublished(article.datePublishedRaw);
    excerpt = article.description || null;
    imageUrl = article.mainImage ? article.mainImage.url : null;
    language = article.inLanguage ? article.inLanguage.toUpperCase() : null;
    title = article.headline || null;
    url = article.canonicalUrl || originalUrl;

    // determine domain after determining canonical url
    domain = parse(url).domain || null;
  } catch (e) {
    url = originalUrl;
    domain = parse(originalUrl).domain;
  }

  return {
    // only include the properties if we have a value
    ...(authors && { authors }),
    ...(datePublished && { datePublished }),
    ...(domain && { domain }),
    ...(excerpt && { excerpt }),
    ...(imageUrl && { imageUrl }),
    ...(language && { language }),
    ...(title && { title }),
    url,
  };
};
