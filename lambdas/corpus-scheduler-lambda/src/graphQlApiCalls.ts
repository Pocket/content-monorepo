import config from './config';
import fetch from 'node-fetch';
import { generateJwt, getCorpusSchedulerLambdaPrivateKey } from './utils';
import { CreateApprovedItemInput, UrlMetadata } from 'content-common';

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 * Calls the createApprovedCorpusItem mutation in curated-corpus-api.
 * @param data
 */
export async function createApprovedCorpusItem(data: CreateApprovedItemInput) {
  // Wait, don't overwhelm the API
  await sleep(2000);
  const mutation = `
    mutation CreateApprovedCorpusItem($data: CreateApprovedCorpusItemInput!) {
      createApprovedCorpusItem(data: $data) {
        externalId
        url
        topic
        title
        status
        source
        publisher
        language
        imageUrl
        excerpt
        authors {
          name
          sortOrder
        }
        isTimeSensitive
        isSyndicated
        isCollection
        createdBy
        createdAt
        scheduledSurfaceHistory {
          scheduledSurfaceGuid
          scheduledDate
        }
      }
    }`;
  //admin api requires jwt token to fetch to add a scheduledItem
  const bearerToken = 'Bearer '.concat(
    generateJwt(await getCorpusSchedulerLambdaPrivateKey(config.jwt.key)),
  );
  const variables = { data };
  const res = await fetch(config.AdminApi, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearerToken,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });
  const result = await res.json();
  // check for any errors returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createApprovedCorpusItem mutation failed: ${result.errors[0].message}`,
    );
  }
  return result;
}

/**
 * Calls the getUrlMetadata query from prospect-api/parser.
 * @param url the url to get the metadata for
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const query = `
      query getUrlMetadata($url: String!) {
        getUrlMetadata(url: $url) {
            url
            title
            publisher
            language
            isSyndicated
            isCollection
            imageUrl
            excerpt
            authors
        }
      }`;

  const variables = { url };

  const res = await fetch(config.AdminApi, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await res.json();
  if (!result.data && result.errors.length > 0) {
    throw new Error(`getUrlMetadata query failed: ${result.errors[0].message}`);
  }

  return result.data.getUrlMetadata;
}
