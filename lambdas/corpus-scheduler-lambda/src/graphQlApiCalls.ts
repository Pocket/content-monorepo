import fetch from 'node-fetch';

import {
  CreateApprovedCorpusItemApiInput,
  CreateScheduledItemInput,
  UrlMetadata,
} from 'content-common';
import {
  ApprovedCorpusItemOutput,
  getApprovedCorpusItemByUrl as getApprovedCorpusItemByUrlCommon,
  getUrlMetadata as getUrlMetadataCommon,
  GraphQlApiCallHeaders,
} from 'lambda-common';

import {
  ApprovedCorpusItemWithScheduleHistoryOutput,
  ScheduledCorpusItemWithApprovedCorpusItemOutput,
} from './types';

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * this function wraps the common function for the purposes of easily mocking in tests
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param url string
 * @returns Promise<ApprovedCorpusItemOutput>
 */
export async function getApprovedCorpusItemByUrl(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  url: string,
): Promise<ApprovedCorpusItemOutput | null> {
  return await getApprovedCorpusItemByUrlCommon(
    adminApiEndpoint,
    graphHeaders,
    url,
  );
}

/**
 * this function wraps the common function for the purposes of easily mocking in tests
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param url string
 * @returns Promise<UrlMetadata>
 */
export async function getUrlMetadata(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  url: string,
): Promise<UrlMetadata> {
  return await getUrlMetadataCommon(adminApiEndpoint, graphHeaders, url);
}

/**
 * Calls the createApprovedCorpusItem mutation in curated-corpus-api.
 * Approves & schedules a candidate
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param data CreateApprovedCorpusItemApiInput
 * @returns Promise<ApprovedCorpusItemWithScheduleHistoryOutput>
 */
export async function createApprovedAndScheduledCorpusItem(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateApprovedCorpusItemApiInput,
): Promise<ApprovedCorpusItemWithScheduleHistoryOutput> {
  // Wait, don't overwhelm the API
  await sleep(2000);
  const mutation = `
    mutation CreateApprovedCorpusItem($data: CreateApprovedCorpusItemInput!) {
      createApprovedCorpusItem(data: $data) {
        externalId
        url
        scheduledSurfaceHistory {
          externalId
        }
      }
    }`;

  const variables = { data };

  const res = await fetch(adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  console.log(
    `CreateApprovedCorpusItem MUTATION OUTPUT: ${JSON.stringify(result)}`,
  );

  // check for any errors returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createApprovedCorpusItem mutation failed: ${result.errors[0].message}`,
    );
  }
  return result.data.createApprovedCorpusItem;
}

/**
 * Calls the createScheduledCorpusItem mutation to schedule an already approved corpus item.
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param data CreateScheduledItemInput
 * @returns Promise<ScheduledCorpusItemWithApprovedCorpusItemOutput>
 */
export async function createScheduledCorpusItem(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateScheduledItemInput,
): Promise<ScheduledCorpusItemWithApprovedCorpusItemOutput> {
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
  const res = await fetch(adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  console.log(
    `CreateScheduledCorpusItem MUTATION OUTPUT: ${JSON.stringify(result)}`,
  );

  // check for any errors returned by the mutation
  if (!result.data && result.errors.length > 0) {
    const error = result.errors[0];
    throw new Error(
      `createScheduledCorpusItem mutation failed with ${error.extensions.code}: ${error.message}`,
    );
  }

  return result.data.createScheduledCorpusItem;
}
