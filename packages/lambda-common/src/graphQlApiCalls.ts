import { UrlMetadata } from 'content-common';
import { ApprovedCorpusItemOutput, GraphQlApiCallHeaders } from './types';

/**
 * creates a header object necessary for making API calls against the graph
 * @param clientName string
 * @param clientVersion string
 * @param jwtBearerToken string
 * @returns GraphQlApiCallHeaders
 */
export const generateGraphQlApiHeaders = (
  clientName: string,
  clientVersion: string,
  jwtBearerToken: string,
): GraphQlApiCallHeaders => {
  return {
    'apollographql-client-name': clientName,
    'apollographql-client-version': clientVersion,
    'Content-Type': 'application/json',
    Authorization: jwtBearerToken,
  };
};

/**
 * Calls the getApprovedCorpusItemByUrl query to fetch and already approved corpus item.
 * @param url the url to get the approved item for
 * @param jwtBearerToken generated bearerToken for admin api
 * @returns { url, externalId } or null if url did not exist in the corpus
 */
export async function getApprovedCorpusItemByUrl(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  url: string,
): Promise<ApprovedCorpusItemOutput | null> {
  const query = `
      query getApprovedCorpusItemByUrl($url: String!) {
        getApprovedCorpusItemByUrl(url: $url) {
          url
          externalId
        }
    }`;

  const variables = { url };

  const res = await fetch(adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query, variables }),
  });

  const result = await res.json();

  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `getApprovedCorpusItemByUrl query failed: ${result.errors[0].message}`,
    );
  }

  return result.data.getApprovedCorpusItemByUrl;
}

/**
 * Calls the getUrlMetadata query from prospect-api/parser.
 * @param url the url to get the metadata for
 * @param bearerToken generated bearerToken for admin api
 */
export async function getUrlMetadata(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  url: string,
): Promise<UrlMetadata> {
  const query = `
        query getUrlMetadata($url: String!) {
          getUrlMetadata(url: $url) {
              url
              title
              publisher
              datePublished
              language
              isSyndicated
              isCollection
              imageUrl
              excerpt
              authors
          }
        }`;

  const variables = { url };

  const res = await fetch(adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query, variables }),
  });

  const result = await res.json();

  if (!result.data && result.errors.length > 0) {
    throw new Error(`getUrlMetadata query failed: ${result.errors[0].message}`);
  }

  return result.data.getUrlMetadata;
}
