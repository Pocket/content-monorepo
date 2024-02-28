import config from './config';
import fetch from 'node-fetch';
import { generateJwt, getCorpusSchedulerLambdaPrivateKey } from './utils';
import {CreateApprovedItemInput} from 'content-common/types';
export async function createApprovedCorpusItem(data: CreateApprovedItemInput) {
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
    if(!result.data && result.errors.length > 0) {
        throw new Error(`createApprovedCorpusItem mutation failed: ${result.errors[0].message}`)
    }
    return result;
}