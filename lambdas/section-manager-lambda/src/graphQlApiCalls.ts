import fetch from 'node-fetch';

import { GraphQlApiCallHeaders } from 'lambda-common';

import config from './config';
import { CreateOrUpdateSectionApiInput } from './types';

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const createOrUpdateSection = async (
  graphHeaders: GraphQlApiCallHeaders,
  data: CreateOrUpdateSectionApiInput,
): Promise<string> => {
  // throttle calls to the admin graph
  await sleep(2000);

  const variables = { data };

  let result;

  const mutation = `
        mutation CreateOrUpdateSection($data: CreateOrUpdateSectionInput!) {
            createOrUpdateSection(data: $data) {
                externalId
            }
        }
    `;

  try {
    const res = await fetch(config.adminApiEndpoint, {
      method: 'post',
      headers: graphHeaders,
      body: JSON.stringify({ query: mutation, variables }),
    });

    result = await res.json();

    console.log(
      `CreateOrUpdateSection MUTATION OUTPUT: ${JSON.stringify(result)}`,
    );
  } catch (ex) {
    throw new Error(`createOrUpdateSection error: ${ex}`);
  }

  // check for any errors when running or returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createOrUpdateSection mutation failed: ${result.errors[0].message}`,
    );
  }

  return result.data.createOrUpdateSection.externalId;
};
