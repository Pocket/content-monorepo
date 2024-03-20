import * as Sentry from '@sentry/node';

// we have to import from @apollo/client/core because importing from
// @apollo/client assumes react will be available and things fail. when things
// get to this state, we should take a long look in the mirror.
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client/core';
import fetch from 'cross-fetch';
import gql from 'graphql-tag';
import fetchRetry from 'fetch-retry';

import config from './config';
import { ClientApiItem } from './types';

let client;
let clientRetryDelay;

/**
 * calls client API to get data for the given url
 * @param url The url to retrieve metadata for.
 * @param retryDelay Time in milliseconds to wait between retries. The default delay is 10 seconds, and was chosen to
 * give subgraphs (like the parser) time to recover. We don't have concrete evidence that a delay helps; it's a guess.
 * @returns JSON response from client API
 */
export const getUrlMetadata = async (
  url: string,
  retryDelay: number = 10000,
): Promise<ClientApiItem | null> => {
  // Move Apollo Client instantiation to inside the function to prevent memory leaks.
  if (!client || clientRetryDelay != retryDelay) {
    client = new ApolloClient({
      link: createHttpLink({
        fetch: fetchRetry(fetch, {
          retries: 2,
          // Retry if the status code indicates that the service is temporarily unavailable.
          // By default, fetch-retry only retries on network errors.
          // 504 is the only one that's been observed in production.
          retryOn: [429, 500, 502, 503, 504],
          retryDelay,
        }),
        uri: config.app.clientApiEndpoint,
      }),
      cache: new InMemoryCache(),
      name: config.app.apolloClientName,
      version: config.app.version,
      defaultOptions: {
        // Disable cache on all queries to save on memory.
        query: {
          fetchPolicy: 'no-cache',
        },
        // And let's not watch any future queries either!
        watchQuery: {
          fetchPolicy: 'no-cache',
        },
      },
    });

    clientRetryDelay = retryDelay;
  }

  const data = await client.query({
    query: gql`
      query ProspectApiUrlMetadata($url: String!) {
        itemByUrl(url: $url) {
          resolvedUrl
          excerpt
          title
          language
          topImageUrl
          datePublished
          authors {
            name
          }
          domainMetadata {
            name
          }
          syndicatedArticle {
            authorNames
            excerpt
            mainImage
            publisher {
              name
              url
            }
            publishedAt
            title
          }
          collection {
            slug
            publishedAt
          }
        }
      }
    `,
    variables: {
      url,
    },
  });

  if (!data.data?.itemByUrl) {
    Sentry.captureException(new Error(`no parser data found for url ${url}`));

    return null;
  }

  return data.data?.itemByUrl;
};
