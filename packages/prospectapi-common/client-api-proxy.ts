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

const fetchWithBackoff = fetchRetry(fetch, {
  retries: 2,
  // Retry if the status code indicates that the service is temporarily unavailable.
  // By default, fetch-retry only retries on network errors.
  // 504 is the only one that's been observed in production.
  retryOn: [429, 500, 502, 503, 504],
  // Retry with exponential backoff to give sub-graphs (like the Parser) time to recover.
  // The delay was chosen arbitrarily. We don't have evidence that it is necessary.
  retryDelay: (attempt) => {
    return Math.pow(2, attempt) * 2000; // 2000, 4000, 8000
  },
});

/**
 * calls client API to get data for the given url
 * @returns JSON response from client API
 */
export const getUrlMetadata = async (
  url: string,
): Promise<ClientApiItem | null> => {
  // Move Apollo Client instantiation to inside the function to prevent memory leaks.
  if (!client) {
    client = new ApolloClient({
      link: createHttpLink({
        fetch: fetchWithBackoff,
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
            title
          }
          collection {
            slug
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
