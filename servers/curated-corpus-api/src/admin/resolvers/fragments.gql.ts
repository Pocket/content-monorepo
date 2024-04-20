import { CuratedItemData, ScheduledItemData } from '../../shared/fragments.gql';
import { gql } from 'graphql-tag';

export const AdminCuratedItemData = gql`
  fragment AdminCuratedItemData on ApprovedCorpusItem {
    ...CuratedItemData
    hasTrustedDomain
  }
  ${CuratedItemData}
`;

export const AdminScheduledItemData = gql`
  fragment AdminScheduledItemData on ScheduledCorpusItem {
    ...ScheduledItemData
    approvedItem {
      ...AdminCuratedItemData
    }
  }
  ${ScheduledItemData}
  ${AdminCuratedItemData}
`;
