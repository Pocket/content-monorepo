import config from "./config";
import fetch from 'node-fetch';
import { generateJwt, getCorpusSchedulerLambdaPrivateKey } from "./utils";

/**
 * TEMPORARY: Testing the auth. Calls the getApprovedCorpusItems query.
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
    let res: fetch.Response;
    try {
        //admin api requires jwt token to fetch to add a scheduledItem
        const bearerToken = 'Bearer '.concat(
            generateJwt(await getCorpusSchedulerLambdaPrivateKey()),
        );
        res = await fetch(config.AdminApi, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                Authorization: bearerToken,
            },
            body: JSON.stringify({ query: query }),
        });
    } catch (e) {
        throw new Error(e);
    }
    return await res.json()
}