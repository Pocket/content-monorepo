import fetch from 'node-fetch';

import { CreateApprovedCorpusItemApiInput, UrlMetadata } from 'content-common';
import {
  ApprovedCorpusItemOutput,
  getApprovedCorpusItemByUrl as getApprovedCorpusItemByUrlCommon,
  getUrlMetadata as getUrlMetadataCommon,
  GraphQlApiCallHeaders,
} from 'lambda-common';

import config from './config';
import {
  CreateSectionItemApiInput,
  CreateOrUpdateSectionApiInput,
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
 * calls the createOrUpdateSection mutation to either create or update
 * a section
 *
 * @param graphHeaders GraphQlApiCallHeaders object
 * @param data CreateOrUpdateSectionApiInput object
 * @returns Promise<string>
 */
export const createOrUpdateSection = async (
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateOrUpdateSectionApiInput,
): Promise<string> => {
  // throttle calls to the admin graph
  await sleep(2000);

  const variables = { data };

  const mutation = `
        mutation CreateOrUpdateSection($data: CreateOrUpdateSectionInput!) {
            createOrUpdateSection(data: $data) {
                externalId
            }
        }
    `;

  const res = await fetch(config.adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  console.log(
    `CreateOrUpdateSection MUTATION OUTPUT: ${JSON.stringify(result)}`,
  );

  // check for any errors when running or returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createOrUpdateSection mutation failed: ${result.errors[0].message}`,
    );
  }

  return result.data.createOrUpdateSection.externalId;
};

/**
 * Calls the createApprovedCorpusItem mutation in curated-corpus-api. Creates
 * an ApproveItem in the corpus.
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param data CreateApprovedCorpusItemApiInput
 * @returns Promise<string> - the externalId of the ApprovedItem created
 */
export async function createApprovedCorpusItem(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateApprovedCorpusItemApiInput,
): Promise<string> {
  // Wait, don't overwhelm the API
  await sleep(2000);

  const mutation = `
    mutation CreateApprovedCorpusItem($data: CreateApprovedCorpusItemInput!) {
      createApprovedCorpusItem(data: $data) {
        externalId
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

  return result.data.createApprovedCorpusItem.externalId;
}

/**
 * Calls the createSectionItem mutation in curated-corpus-api. Creates a
 * SectionItem in the corpus.
 *
 * @param adminApiEndpoint  string
 * @param graphHeaders GraphQlApiHeaders object
 * @param data CreateSectionItemApiInput
 * @returns Promise<string> - externalId of the created SectionItem
 */
export async function createSectionItem(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateSectionItemApiInput,
): Promise<string> {
  await sleep(2000);

  const mutation = `
    mutation CreateSectionItem($data: CreateSectionItemInput!) {
      createSectionItem(data: $data) {
        externalId
      }
    }`;

  const variables = { data };

  const res = await fetch(adminApiEndpoint, {
    method: 'post',
    headers: graphHeaders,
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  console.log(`CreateSectionItem MUTATION OUTPUT: ${JSON.stringify(result)}`);

  // check for any errors returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createSectionItem mutation failed: ${result.errors[0].message}`,
    );
  }

  return result.data.createSectionItem.externalId;
}
