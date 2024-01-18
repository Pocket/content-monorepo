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
import pRetry from 'p-retry';

import config from './config';
import { ClientApiItem } from './types';

let client;

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
      link: createHttpLink({ fetch, uri: config.app.clientApiEndpoint }),
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

  const dataPromise = async () =>
    client.query({
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

  // pRetry with retries the query on failure, with exponential backoff
  const data = await pRetry(dataPromise, { retries: 2 });

  if (!data.data?.itemByUrl) {
    Sentry.captureException(new Error(`no parser data found for url ${url}`));

    return null;
  }

  return data.data?.itemByUrl;
};
