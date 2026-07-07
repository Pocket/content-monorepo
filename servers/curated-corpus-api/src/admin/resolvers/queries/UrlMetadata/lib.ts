import * as Sentry from '@sentry/node';
import { parse } from 'tldts';

import { UrlMetadata } from 'content-common';

import config from '../../../../config';

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
 * use node fetch to hit the external metadata parser.
 *
 * broken out into a standalone function for easier mocking in tests.
 *
 * @param url URL for which to fetch metadata
 * @param metadataParserEndpointUrl URL endpoint of the metadata service
 * @param metadataParserApiKey API key for the metadata service
 * @returns JSON from the metadata service, or an empty object on failure
 */
export const fetchUrlMetadata = async (
  url: string,
  metadataParserEndpointUrl: string,
  metadataParserApiKey: string,
): Promise<{ [key: string]: any }> => {
  // Zyte-specific implementation

  // default response - empty object
  let json: { [key: string]: any } = {};
  let fetchResponse: Response | undefined = undefined;

  // 1. attempt to fetch metadata from zyte
  try {
    fetchResponse = await fetch(metadataParserEndpointUrl, {
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          metadataParserApiKey + ':',
        ).toString('base64')}`,
      },
      method: 'POST',
      signal: AbortSignal.timeout(config.metadataParser.timeout),
    });

    // if the fetch gave us a non-2xx response, send to sentry.
    // this will result in an empty object returned to the caller.
    if (!fetchResponse.ok) {
      // if response is not ok, try to capture the body of the response, as it
      // may hold important error info.
      const responseBody = await fetchResponse.text().catch(() => undefined);

      Sentry.captureException(
        new Error(`Metadata parser returned non-2xx HTTP status`),
        {
          extra: {
            status: fetchResponse.status,
            url,
            responseBody,
          },
        },
      );
    }
  } catch (e) {
    // if any error occurred above, send it to sentry
    Sentry.captureException(e, {
      extra: {
        message: `Metadata parser general fetch failure`,
        url,
      },
    });
  }

  // 2. if we successfully fetched data from zyte, attempt to get the JSON.
  if (fetchResponse && fetchResponse.ok) {
    try {
      json = await fetchResponse.json();
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          message: `Metadata parser JSON response failure`,
          url,
        },
      });
    }
  }

  // 3. zyte's response may be a 2xx, with valid JSON, but there still may be
  // an issue with the url attempted to be scraped.
  // https://docs.zyte.com/zyte-api/usage/reference.html#operation/extract/response/200/statusCode
  if (json.statusCode >= 400) {
    Sentry.captureException(
      new Error(`Metadata parser failed to parse given url.`),
      {
        extra: {
          url,
          status: json.statusCode,
        },
      },
    );
  }

  // 4. return the json from zyte, or an empty object.
  return json;
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

/**
 * ensures a given URL is valid for our use cases. we only want http/https urls
 * that point to a valid domain/tld. IP addresses should not be allowed.
 *
 * built from https://github.com/The-Node-Forge/url-validator/blob/main/src/validateUrl.ts
 * keeping code local for tweaks and reduce package dependencies for a straight
 * forward function.
 *
 * @param url
 * @returns boolean
 */
export const validateUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);

    // ensure valid protocols (http/https)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // check for user:password in domain
    if (parsedUrl.username || parsedUrl.password) {
      return false;
    }

    // check for valid domain/TLD
    // isIp is an extra careful check; tldts sets domain=null for IPs
    const parsed = parse(parsedUrl.hostname);
    if (!parsed.domain || parsed.isIp) {
      return false;
    }

    // reject hostnames with a leading dot
    if (parsedUrl.hostname.startsWith('.')) {
      return false;
    }

    // reject hostnames with a trailing dot
    if (parsedUrl.hostname.endsWith('.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
