import { gql } from 'graphql-tag';

export const ProspectData = gql`
  fragment ProspectData on Prospect {
    id
    prospectId
    scheduledSurfaceGuid
    topic
    prospectType
    url
    createdAt
    imageUrl
    publisher
    domain
    title
    excerpt
    language
    saveCount
    isSyndicated
    isCollection
    authors
    approvedCorpusItem {
      url
    }
  }
`;
