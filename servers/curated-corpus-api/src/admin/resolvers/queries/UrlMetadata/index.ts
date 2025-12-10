import { UserInputError } from '@pocket-tools/apollo-utils';

import { UrlMetadata } from 'content-common';

import config from '../../../../config';
import { IAdminContext } from '../../../context';
import { convertParserJsonToUrlMetadata, fetchUrlMetadata } from './lib';
import { lookupPublisher } from '../../../../database/mutations/PublisherDomain';

/**
 * main entry point for the resolver for the getUrlMetadata query. validates
 * the url provided.
 *
 * @param parent
 * @param param1
 * @param ctx
 * @returns UrlMetadata object
 */
export const getUrlMetadata = async (
  parent,
  { url },
  context: IAdminContext,
): Promise<UrlMetadata> => {
  try {
    // validate url by throwing if url format is incorrect
    new URL(url).toString();
  } catch (error) {
    throw new UserInputError(`${url} is not a valid url`);
  }

  // attempts to retrieve metadata about the given url from an external
  // metadata scraper service. returns an empty object if the external
  // service errors.
  const metadataJson = await fetchUrlMetadata(
    url,
    config.metadataParser.endpoint,
    config.metadataParser.apiKey,
  );

  // returns a UrlMetadata formatted object, at minimum containing a URL and
  // a domain.
  const urlMetadata = convertParserJsonToUrlMetadata(url, metadataJson);

  // attempt to find the publisher value in our internal db, will either be a
  // string value or null
  const publisher = await lookupPublisher(context.db, urlMetadata.url);

  if (publisher) {
    urlMetadata.publisher = publisher;
  }

  return urlMetadata;
};
