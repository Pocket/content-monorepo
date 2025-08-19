import { BaseSectionData, BaseSectionItemData, CuratedItemData, ScheduledItemData } from '../../shared/fragments.gql';
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

export const AdminScheduleReviewData = gql`
  fragment AdminScheduleReviewData on ScheduleReview {
    scheduledSurfaceGuid
    scheduledDate
    reviewedBy
    reviewedAt
  }
`;

export const AdminSectionItemData = gql`
    fragment AdminSectionItemData on SectionItem {
        ...BaseSectionItemData
        approvedItem {
            ...CuratedItemData
        }
        createdAt
        updatedAt
    }
    ${BaseSectionItemData}
    ${CuratedItemData}
`;

export const AdminSectionData = gql`
    fragment AdminSectionData on Section {
        ...BaseSectionData
        sectionItems {
            ...AdminSectionItemData
        }
        startDate
        endDate
        disabled
        createdAt
        updatedAt
    }
    ${BaseSectionData}
    ${AdminSectionItemData}
`;
