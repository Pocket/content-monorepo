import config from './config';
import fetch from 'node-fetch';
import { CreateOrUpdateSectionApiInput } from './types';

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export type GraphQlApiCallHeaders = {
  'apollographql-client-name': string;
  'apollographql-client-version': string;
  'Content-Type': 'application/json';
  Authorization: string;
};

export const generateGraphQlApiCallHeaders = (
  bearerToken: string,
): GraphQlApiCallHeaders => {
  return {
    'apollographql-client-name': config.app.name,
    'apollographql-client-version': config.app.version,
    'Content-Type': 'application/json',
    Authorization: bearerToken,
  };
};

export const createOrUpdateSection = async (
  data: CreateOrUpdateSectionApiInput,
  bearerToken: string,
) => {
  await sleep(2000);

  const mutation = `
        mutation CreateOrUpdateSection($data: CreateOrUpdateSectionInput!) {
            createOrUpdateSection(data: $data) {
                externalId
            }
        }
    `;

  const variables = { data };

  const res = await fetch(config.adminApiEndpoint, {
    method: 'post',
    headers: generateGraphQlApiCallHeaders(bearerToken),
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  console.log(
    `CreateOrUpdateSection MUTATION OUTPUT: ${JSON.stringify(result)}`,
  );

  // check for any errors returned by the mutation
  if (!result.data && result.errors.length > 0) {
    throw new Error(
      `createOrUpdateSection mutation failed: ${result.errors[0].message}`,
    );
  }

  return result.data.createOrUpdateSection;
};
