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
    grade
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

export const CorpusItemData = gql `
  fragment CorpusItemData on CorpusItem {
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
      topic
      grade
      isTimeSensitive
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
export const BaseSectionItemData = gql`
    fragment BaseSectionItemData on SectionItem {
        externalId
        rank
    }
`;

export const BaseSectionData = gql`
    fragment BaseSectionData on Section {
        externalId
        title
        scheduledSurfaceGuid
        sort
        createSource
        active
    }
`;
