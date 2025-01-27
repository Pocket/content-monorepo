import { gql } from 'graphql-tag';
import { RejectedItemData, SectionData } from '../../../shared/fragments.gql';
import { AdminCuratedItemData, AdminScheduledItemData } from '../fragments.gql';

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
          ...AdminCuratedItemData
        }
      }
    }
  }
  ${AdminCuratedItemData}
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
      scheduleReview {
        scheduledDate
        scheduledSurfaceGuid
        reviewedBy
        reviewedAt
      }
      items {
        ...AdminScheduledItemData
      }
    }
  }
  ${AdminScheduledItemData}
`;

export const GET_APPROVED_ITEM_BY_URL = gql`
  query getApprovedCorpusItemByUrl($url: String!) {
    getApprovedCorpusItemByUrl(url: $url) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const GET_APPROVED_ITEM_BY_EXTERNAL_ID = gql`
  query approvedCorpusItemByExternalId($externalId: ID!) {
    approvedCorpusItemByExternalId(externalId: $externalId) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY = gql`
  query getApprovedCorpusItemByUrl(
    $url: String!
    $scheduledSurfaceGuid: ID
    $limit: NonNegativeInt
  ) {
    getApprovedCorpusItemByUrl(url: $url) {
      ...AdminCuratedItemData
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
  ${AdminCuratedItemData}
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
        ...AdminCuratedItemData
      }
    }
  }
  ${AdminCuratedItemData}
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

export const GET_SECTIONS_WITH_SECTION_ITEMS = gql`
  query GetSectionsWithSectionItems($scheduledSurfaceGuid: ID!){
      getSectionsWithSectionItems(scheduledSurfaceGuid: $scheduledSurfaceGuid) {
        ...SectionData
    }
  }
  ${SectionData}
`;