import { gql } from 'graphql-tag';
import {
  RejectedItemData,
  SectionItemData,
} from '../../../shared/fragments.gql';
import {
  AdminCuratedItemData,
  AdminScheduledItemData,
  AdminScheduleReviewData,
} from '../fragments.gql';

/**
 * Sample mutations for Apollo Server integration tests as used in
 * Curation Admin Tools Frontend and this repository's integration tests.
 */
export const CREATE_APPROVED_ITEM = gql`
  mutation createApprovedItem($data: CreateApprovedCorpusItemInput!) {
    createApprovedCorpusItem(data: $data) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const UPDATE_APPROVED_ITEM = gql`
  mutation updateApprovedCorpusItem($data: UpdateApprovedCorpusItemInput!) {
    updateApprovedCorpusItem(data: $data) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const UPDATE_APPROVED_ITEM_GRADE = gql`
  mutation updateApprovedCorpusItemGrade(
    $data: UpdateApprovedCorpusItemGradeInput!
  ) {
    updateApprovedCorpusItemGrade(data: $data) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const REJECT_APPROVED_ITEM = gql`
  mutation rejectApprovedItem($data: RejectApprovedCorpusItemInput!) {
    rejectApprovedCorpusItem(data: $data) {
      ...AdminCuratedItemData
    }
  }
  ${AdminCuratedItemData}
`;

export const CREATE_REJECTED_ITEM = gql`
  mutation createRejectedItem($data: CreateRejectedCorpusItemInput!) {
    createRejectedCorpusItem(data: $data) {
      ...RejectedItemData
    }
  }
  ${RejectedItemData}
`;

export const CREATE_SCHEDULED_ITEM = gql`
  mutation createScheduledItem($data: CreateScheduledCorpusItemInput!) {
    createScheduledCorpusItem(data: $data) {
      ...AdminScheduledItemData
    }
  }
  ${AdminScheduledItemData}
`;

export const DELETE_SCHEDULED_ITEM = gql`
  mutation deleteScheduledItem($data: DeleteScheduledCorpusItemInput!) {
    deleteScheduledCorpusItem(data: $data) {
      ...AdminScheduledItemData
    }
  }
  ${AdminScheduledItemData}
`;

export const RESCHEDULE_SCHEDULED_ITEM = gql`
  mutation rescheduleScheduledItem($data: RescheduleScheduledCorpusItemInput!) {
    rescheduleScheduledCorpusItem(data: $data) {
      ...AdminScheduledItemData
    }
  }
  ${AdminScheduledItemData}
`;

export const UPLOAD_APPROVED_ITEM_IMAGE = gql`
  mutation uploadApprovedCorpusItemImage($image: Upload!) {
    uploadApprovedCorpusItemImage(data: $image) {
      url
    }
  }
`;

export const CREATE_SCHEDULE_REVIEW = gql`
  mutation createScheduleReview($data: CreateScheduleReviewInput!) {
    createScheduleReview(data: $data) {
      ...AdminScheduleReviewData
    }
  }
  ${AdminScheduleReviewData}
`;

export const CREATE_SECTION_ITEM = gql`
  mutation createSectionItem($data: CreateSectionItemInput!) {
    createSectionItem(data: $data) {
      ...SectionItemData
    }
  }
  ${SectionItemData}
`;
