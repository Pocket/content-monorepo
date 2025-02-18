import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import { Topics } from 'content-common';

import {
  createApprovedItem as dbCreateApprovedItem,
  createRejectedItem,
  createScheduledItem,
  deleteApprovedItem as dbDeleteApprovedItem,
  updateApprovedItem as dbUpdateApprovedItem,
} from '../../../../database/mutations';
import { getApprovedItemByExternalId } from '../../../../database/queries';
import {
  ApprovedCorpusItemPayload,
  RejectedCorpusItemPayload,
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
} from '../../../../events/types';
import { uploadImageToS3 } from '../../../aws/upload';
import {
  ACCESS_DENIED_ERROR,
  ApprovedItemS3ImageUrl,
  RejectionReason,
  ScheduledCorpusItemStatus,
} from '../../../../shared/types';
import { scheduledSurfaceAllowedValues } from '../../../../shared/utils';
import {
  ApprovedItem,
  CreateRejectedItemInput,
} from '../../../../database/types';
import { IAdminContext } from '../../../context';
import { createTrustedDomainIfPastScheduledDateExists } from '../../../../database/mutations/TrustedDomain';

/**
 * Creates an approved curated item with data supplied. Optionally, schedules the freshly
 * created item to go onto Scheduled Surface for the date provided.
 *
 * @param parent
 * @param data
 * @param context
 * @param db
 */
export async function createApprovedItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ApprovedItem> {
  const {
    scheduledDate,
    scheduledSurfaceGuid,
    scheduledSource,
    actionScreen,
    ...approvedItemData
  } = data;

  // If this item is being created and scheduled at the same time,
  // the user needs write access to the relevant scheduled surface.
  if (
    scheduledSurfaceGuid &&
    !context.authenticatedUser.canWriteToSurface(scheduledSurfaceGuid)
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // If there is no optional scheduling, check if the user can write to the corpus.
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  if (
    scheduledDate &&
    scheduledSurfaceGuid &&
    scheduledSource &&
    !scheduledSurfaceAllowedValues.includes(scheduledSurfaceGuid)
  ) {
    throw new UserInputError(
      `Cannot create a scheduled entry with Scheduled Surface GUID of "${data.scheduledSurfaceGuid}".`,
    );
  }

  // validate topic is a valid enum
  if (!Object.values(Topics).includes(approvedItemData.topic)) {
    throw new UserInputError(
      `Cannot create a corpus item with the topic "${approvedItemData.topic}".`,
    );
  }

  const approvedItem = await dbCreateApprovedItem(
    context.db,
    approvedItemData,
    context.authenticatedUser.username,
  );

  // build the payload for event emission
  // contains properties not stored in this service's db
  const approvedItemForEvents: ApprovedCorpusItemPayload = {
    ...approvedItem,
    action_screen: actionScreen,
  };

  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.ADD_ITEM,
    approvedItemForEvents,
  );

  if (scheduledDate && scheduledSurfaceGuid && scheduledSource) {
    // Note that we create a scheduled item but don't return it
    // in the mutation response. Need to evaluate if we do need to return it
    // alongside the approved item.
    const scheduledItem = await createScheduledItem(
      context.db,
      {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid,
        scheduledDate,
        source: scheduledSource,
      },
      context.authenticatedUser.username,
    );

    // build an extended copy of the returned scheduledItem which will include
    // additional event tracking info
    const scheduledItemForEvents: ScheduledCorpusItemPayload = {
      scheduledCorpusItem: {
        ...scheduledItem,
        status: ScheduledCorpusItemStatus.ADDED,
        generated_by: scheduledSource,
        action_screen: actionScreen,
      },
    };

    context.emitScheduledCorpusItemEvent(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
      scheduledItemForEvents,
    );

    // Make this domain trusted if it was scheduled before today.
    await createTrustedDomainIfPastScheduledDateExists(
      context.db,
      scheduledItem.approvedItem.domainName,
    );
  }

  return approvedItem;
}

/**
 * Updates an approved curated item with data supplied.
 *
 * @param parent
 * @param data
 * @param context
 * @param db
 */
export async function updateApprovedItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ApprovedItem> {
  const { actionScreen, ...updatedItemData } = data;

  // Check if the user can perform this mutation
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // validate topic is a valid enum
  if (!Object.values(Topics).includes(updatedItemData.topic)) {
    throw new UserInputError(
      `Cannot create a corpus item with the topic "${updatedItemData.topic}".`,
    );
  }

  // To be able to delete authors associated with a corpus item, we first need
  // to get the internal (integer) id for the story. This means doing a DB query
  // to fetch the entire object.
  const existingItem = await getApprovedItemByExternalId(
    context.db,
    updatedItemData.externalId,
  );

  // Remove the old author(s) from the DB records before we run the update function
  await context.db.approvedItemAuthor.deleteMany({
    where: {
      approvedItemId: existingItem?.id,
    },
  });

  // Update the corpus item with the updated fields sent through, including
  // any authors.
  const approvedItem = await dbUpdateApprovedItem(
    context.db,
    updatedItemData,
    context.authenticatedUser.username,
  );

  // build the payload for event emission
  // contains properties not stored in this service's db
  const updatedItemForEvents: ApprovedCorpusItemPayload = {
    ...approvedItem,
    action_screen: actionScreen,
  };

  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.UPDATE_ITEM,
    updatedItemForEvents,
  );

  return approvedItem;
}

/**
 * Removes an approved item from the corpus and adds its data to the rejected item
 * table. Also deletes all related SectionItems.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function rejectApprovedItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ApprovedItem> {
  const { actionScreen, ...rejectedItemData } = data;

  // check if user is not authorized to reject an item
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  let approvedItem = await dbDeleteApprovedItem(
    context.db,
    rejectedItemData.externalId,
  );

  // validate reason enum
  // rejection reason comes in as a comma separated string
  rejectedItemData.reason.split(',').map((reason) => {
    // remove whitespace in the check below!
    if (!Object.values(RejectionReason).includes(reason.trim())) {
      throw new UserInputError(`"${reason}" is not a valid rejection reason.`);
    }
  });

  // From our thoughtfully saved before deletion Approved Item, construct
  // input data for a Rejected Item entry.
  const input: CreateRejectedItemInput = {
    // manually added items do not have a prospectId
    prospectId: approvedItem.prospectId || undefined,
    url: approvedItem.url,
    title: approvedItem.title,
    // TODO: consider removing the `||` part once legacy Curation data is fully migrated to Curated Corpus.
    topic: approvedItem.topic || '',
    language: approvedItem.language,
    publisher: approvedItem.publisher,
    reason: rejectedItemData.reason,
  };

  // Create a Rejected Item. The Prisma function will handle URL uniqueness checks
  const rejectedItem = await createRejectedItem(
    context.db,
    input,
    context.authenticatedUser.username,
  );

  // Let Snowplow know we've deleted something from the curated corpus.
  // Before that, we need to update the values for the `updatedAt` and `updatedBy`
  // fields for the deleted approved item. Let's take these values from
  // the newly created Rejected Item.
  const approvedItemForEvents: ApprovedCorpusItemPayload = {
    ...approvedItem,
    updatedAt: rejectedItem.createdAt,
    updatedBy: rejectedItem.createdBy,
    action_screen: actionScreen,
  };

  // Now emit the event with the updated Approved Item data.
  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.REMOVE_ITEM,
    approvedItemForEvents,
  );

  const rejectedItemPayload: RejectedCorpusItemPayload = {
    ...rejectedItem,
    // this helps analytics correlate data between the approved items that were rejected
    // and the rejected item. *not* present when rejecting a prospect.
    approvedCorpusItemExternalId: approvedItem.externalId,
    action_screen: actionScreen,
  };

  // Let Snowplow know that an entry was added to the Rejected Items table.
  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.REJECT_ITEM,
    rejectedItemPayload,
  );

  // finally, for returned data purposes, set the updatedBy value to be the
  // user that performed this deletion.
  // (fwiw, i don't know if there's a requirement for this...)
  approvedItem.updatedBy = context.authenticatedUser.username;

  return approvedItem;
}

/**
 * Uploads an image to the S3 bucket for an
 * Approved Curated item
 *
 * @param parent
 * @param data
 * @param context
 * @param s3
 */
export async function uploadApprovedItemImage(
  parent,
  { data },
  context: IAdminContext,
): Promise<ApprovedItemS3ImageUrl> {
  // check if user is allowed to upload images
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  const image = await data.promise;
  return await uploadImageToS3(context.s3, image);
}

/**
 * Updates the grade value associated with the approved corpus item.
 *
 * @param parent
 * @param data
 * @param context
 * @returns ApprovedItem
 */
export async function updateApprovedItemGrade(
  parent,
  { data },
  context: IAdminContext,
): Promise<ApprovedItem> {
  // Check if the user can perform this mutation
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  const { actionScreen, ...gradedItemData } = data;

  // Update the corpus item with the updated fields sent through, including
  // any authors.
  const approvedItem = await dbUpdateApprovedItem(
    context.db,
    gradedItemData,
    context.authenticatedUser.username,
  );

  // build the payload for event emission
  // contains properties not stored in this service's db
  const updatedItemForEvents: ApprovedCorpusItemPayload = {
    ...approvedItem,
    action_screen: actionScreen,
  };

  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.UPDATE_ITEM,
    updatedItemForEvents,
  );

  return approvedItem;
}
