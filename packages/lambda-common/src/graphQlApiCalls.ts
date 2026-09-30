import { ApprovedCorpusItemOutput, GraphQlApiCallHeaders } from './types';

/**
 * creates a header object necessary for making API calls against the graph
 *
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
 *
 * @param url the url to get the approved item for
 * @param jwtBearerToken generated bearerToken for admin api
 * @returns Promise<ApprovedCorpusItemOutput | null> - null is returned if the item is not found
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
