import { gql } from 'graphql-tag';
import {
  CuratedItemData,
  RejectedItemData,
  ScheduledItemData,
} from '../../../shared/fragments.gql';

/**
 * Sample queries for Apollo Server integration tests as used in
 * Curation Admin Tools Frontend and this repository's integration tests.
 */
export const GET_APPROVED_ITEMS = gql`
  query getApprovedItems(
    $filters: ApprovedCorpusItemFilter
    $pagination: PaginationInput
  ) {
    getApprovedCorpusItems(filters: $filters, pagination: $pagination) {
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
          ...CuratedItemData
        }
      }
    }
  }
  ${CuratedItemData}
`;

export const GET_REJECTED_ITEMS = gql`
  query getRejectedItems(
    $filters: RejectedCorpusItemFilter
    $pagination: PaginationInput
  ) {
    getRejectedCorpusItems(filters: $filters, pagination: $pagination) {
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
          ...RejectedItemData
        }
      }
    }
  }
  ${RejectedItemData}
`;

export const GET_SCHEDULED_ITEMS = gql`
  query getScheduledItems($filters: ScheduledCorpusItemsFilterInput!) {
    getScheduledCorpusItems(filters: $filters) {
      totalCount
      collectionCount
      syndicatedCount
      scheduledDate
      items {
        ...ScheduledItemData
      }
    }
  }
  ${ScheduledItemData}
`;

export const GET_APPROVED_ITEM_BY_URL = gql`
  query getApprovedCorpusItemByUrl($url: String!) {
    getApprovedCorpusItemByUrl(url: $url) {
      ...CuratedItemData
    }
  }
  ${CuratedItemData}
`;

export const GET_APPROVED_ITEM_BY_EXTERNAL_ID = gql`
  query approvedCorpusItemByExternalId($externalId: ID!) {
    approvedCorpusItemByExternalId(externalId: $externalId) {
      ...CuratedItemData
    }
  }
  ${CuratedItemData}
`;

export const GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY = gql`
  query getApprovedCorpusItemByUrl(
    $url: String!
    $scheduledSurfaceGuid: ID
    $limit: NonNegativeInt
  ) {
    getApprovedCorpusItemByUrl(url: $url) {
      ...CuratedItemData
      scheduledSurfaceHistory(
        filters: { scheduledSurfaceGuid: $scheduledSurfaceGuid, limit: $limit }
      ) {
        externalId
        createdBy
        scheduledDate
        scheduledSurfaceGuid
      }
    }
  }
  ${CuratedItemData}
`;

export const GET_SCHEDULED_SURFACES_FOR_USER = gql`
  query getScheduledSurfacesForUser {
    getScheduledSurfacesForUser {
      guid
      name
      ianaTimezone
      prospectTypes
    }
  }
`;

export const APPROVED_ITEM_REFERENCE_RESOLVER = gql`
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on ApprovedCorpusItem {
        ...CuratedItemData
      }
    }
  }
  ${CuratedItemData}
`;

export const REJECTED_ITEM_REFERENCE_RESOLVER = gql`
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on RejectedCorpusItem {
        ...RejectedItemData
      }
    }
  }
  ${RejectedItemData}
`;

export const GET_OPEN_GRAPH_FIELDS = gql`
  query GetOpenGraphFields($url: Url!) {
    getOpenGraphFields(url: $url) {
      description
    }
  }
`;
