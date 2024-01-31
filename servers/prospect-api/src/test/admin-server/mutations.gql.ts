import { gql } from 'graphql-tag';
import { ProspectData } from './fragments.gql';

/**
 * sample mutations for apollo server integration tests
 */
export const UPDATE_PROSPECT_AS_CURATED = gql`
  mutation updateProspectAsCurated($id: ID!) {
    updateProspectAsCurated(id: $id) {
      ...ProspectData
    }
  }
  ${ProspectData}
`;

export const UPDATE_REMOVE_PROSPECT = gql`
  mutation removeProspect($data: RemoveProspectInput!) {
    removeProspect(data: $data) {
      ...ProspectData
    }
  }
  ${ProspectData}
`;
