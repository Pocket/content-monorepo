import config from "./config";
import fetch from 'node-fetch';
import { generateJwt, getCorpusSchedulerLambdaPrivateKey } from "./utils";

/**
 * TEMPORARY: Testing the auth. Call the getApprovedCorpusItems query.
 */
export async function getApprovedCorpusItems() {
    const query = `
    query GetApprovedCorpusItems {
      getApprovedCorpusItems {
        totalCount
        edges {
          node {
            url
            title
            status
            source
            publisher
            language
          }
        }
      }
    }`;
    //admin api requires jwt token to fetch to add a scheduledItem
    const bearerToken = 'Bearer '.concat(
        generateJwt(await getCorpusSchedulerLambdaPrivateKey()),
    );
    const fakeT
    console.log('bearerToken:  ', bearerToken);
    console.log('config.AdminApi: ', config.AdminApi);
    const res = await fetch(config.AdminApi, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            Authorization: bearerToken,
        },
        body: JSON.stringify({ query: query }),
    });
    console.log(await  res.json());
    return await res.json()
}