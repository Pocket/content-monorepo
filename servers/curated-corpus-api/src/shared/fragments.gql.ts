import { gql } from 'graphql-tag';

export const CuratedItemData = gql`
  fragment CuratedItemData on ApprovedCorpusItem {
    externalId
    prospectId
    title
    language
    publisher
    datePublished
    url
    imageUrl
    excerpt
    authors {
      name
      sortOrder
    }
    status
    topic
    source
    isCollection
    isTimeSensitive
    isSyndicated
    createdBy
    createdAt
    updatedBy
    updatedAt
  }
`;

export const RejectedItemData = gql`
  fragment RejectedItemData on RejectedCorpusItem {
    externalId
    prospectId
    url
    title
    topic
    language
    publisher
    reason
    createdBy
    createdAt
  }
`;

export const ScheduledItemData = gql`
  fragment ScheduledItemData on ScheduledCorpusItem {
    externalId
    createdAt
    createdBy
    updatedAt
    updatedBy
    scheduledDate
    source
    approvedItem {
      ...CuratedItemData
    }
  }
  ${CuratedItemData}
`;
