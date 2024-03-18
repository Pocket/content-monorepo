import config from './config';
import fetch from 'node-fetch';
import {
  CreateApprovedItemInput,
  CreateScheduledItemInput,
  UrlMetadata,
} from 'content-common';

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 * Calls the createApprovedCorpusItem mutation in curated-corpus-api.
 * @param data
 * @param bearerToken generated bearerToken for admin api
 */
export async function createApprovedCorpusItem(
  data: CreateApprovedItemInput,
  bearerToken: string,
) {
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
 * @param bearerToken generated bearerToken for admin api
 */
export async function fetchUrlMetadata(
  url: string,
  bearerToken: string,
): Promise<UrlMetadata> {
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
      Authorization: bearerToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await res.json();
  if (!result.data && result.errors.length > 0) {
    throw new Error(`getUrlMetadata query failed: ${result.errors[0].message}`);
  }

  return result.data.getUrlMetadata;
}

/**
 * Calls the getApprovedCorpusItemByUrl query to fetch and already approved corpus item.
 * @param url the url to get the approved item for
 * @param bearerToken generated bearerToken for admin api
 * @returns { url, externalId } or null if url did not exist in the corpus
 */
export async function getApprovedCorpusItemByUrl(
  url: string,
  bearerToken: string,
) {
  const query = `
    query getApprovedCorpusItemByUrl($url: String!) {
      getApprovedCorpusItemByUrl(url: $url) {
        url
        externalId
      }
  }`;

  const variables = { url };

  const res = await fetch(config.AdminApi, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearerToken,
    },
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
 * Calls the createScheduledCorpusItem mutation to schedule an already approved corpus item.
 * @param data
 * @param bearerToken generated bearerToken for admin api
 */
export async function createScheduledCorpusItem(
  data: CreateScheduledItemInput,
  bearerToken: string,
) {
  const mutation = `
    mutation CreateScheduledCorpusItem($data: CreateScheduledCorpusItemInput!) {
    createScheduledCorpusItem(data: $data) {
      externalId
      approvedItem {
        url
        title
      }
    }
  }`;

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
      `createScheduledCorpusItem mutation failed: ${result.errors[0].message}`,
    );
  }
  return result;
}
