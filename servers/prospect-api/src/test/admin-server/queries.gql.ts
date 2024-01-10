import { gql } from 'graphql-tag';
import { ProspectData } from './fragments.gql';

/**
 * sample queries for apollo server integration tests
 */
export const GET_PROSPECTS = gql`
  query getProspects($filters: GetProspectsFilters!) {
    getProspects(filters: $filters) {
      ...ProspectData
    }
  }
  ${ProspectData}
`;
