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

/**
 * sample mutations for apollo server integration tests
 */
export const UPDATE_DISMISS_PROSPECT = gql`
  mutation dismissProspect($id: ID!) {
    dismissProspect(id: $id) {
      ...ProspectData
    }
  }
  ${ProspectData}
`;
