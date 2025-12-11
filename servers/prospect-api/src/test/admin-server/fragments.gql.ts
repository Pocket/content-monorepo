import { gql } from 'graphql-tag';

export const ProspectData = gql`
  fragment ProspectData on Prospect {
    approvedCorpusItem {
      url
    }
    authors
    createdAt
    datePublished
    domain
    excerpt
    id
    imageUrl
    isCollection
    isSyndicated
    language
    prospectId
    prospectType
    publisher
    saveCount
    scheduledSurfaceGuid
    title
    topic
    url
  }
`;
