import { gql } from 'graphql-tag';

export const GET_SCHEDULED_SURFACE = gql`
  query scheduledSurface($id: ID!) {
    scheduledSurface(id: $id) {
      id
      name
    }
  }
`;

export const GET_SCHEDULED_SURFACE_WITH_ITEMS = gql`
  query scheduledSurfaceWithItems($id: ID!, $date: Date!) {
    scheduledSurface(id: $id) {
      id
      name
      items(date: $date) {
        id
        surfaceId
        scheduledDate
        corpusItem {
          id
          url
          title
          excerpt
          language
          authors {
            name
            sortOrder
          }
          publisher
          datePublished
          imageUrl
          image {
            url
          }
          topic
        }
      }
    }
  }
`;

export const CORPUS_ITEM_REFERENCE_RESOLVER = gql`
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on CorpusItem {
        id
        title
        authors {
          name
        }
      }
      ... on SavedItem {
        corpusItem {
          id
          title
          authors {
            name
          }
        }
      }
    }
  }
`;

export const CORPUS_ITEM_TARGET_REFERENCE_RESOLVER = gql`
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on CorpusItem {
        id
        title
        target {
          __typename

          ... on Collection {
            slug
          }

          ... on SyndicatedArticle {
            slug
          }
        }
      }
    }
  }
`;

export const CORPUS_ITEMS = gql`
  query corpusItems($filters: CorpusItemFilter, $pagination: PaginationInput) {
    corpusItems(filters: $filters, pagination: $pagination) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          authors {
            name
          }
          publisher
          datePublished
          excerpt
          topic
          target {
            __typename
            ... on Collection {
              slug
            }

            ... on SyndicatedArticle {
              slug
            }
          }
        }
      }
    }
  }
`;
