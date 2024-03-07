import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { RejectedCuratedCorpusItem } from '.prisma/client';
import { createRejectedItem as dbCreateRejectedItem } from '../../../database/mutations';
import {
  RejectedCorpusItemPayload,
  ReviewedCorpusItemEventType,
} from '../../../events/types';
import { RejectionReason, ACCESS_DENIED_ERROR } from '../../../shared/types';
import { IAdminContext } from '../../context';

/**
 * Creates a rejected curated item with data supplied.
 *
 * @param parent
 * @param data
 * @param context
 * @param db
 */
export async function createRejectedItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<RejectedCuratedCorpusItem> {
  const { actionScreen, ...createRejectedItemData } = data;

  // check if user is not authorized to reject an item
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // validate reason enum
  // rejection reason comes in as a comma separated string
  createRejectedItemData.reason.split(',').map((reason) => {
    // remove whitespace in the check below!
    if (!Object.values(RejectionReason).includes(reason.trim())) {
      throw new UserInputError(`"${reason}" is not a valid rejection reason.`);
    }
  });

  const rejectedItem = await dbCreateRejectedItem(
    context.db,
    createRejectedItemData,
    context.authenticatedUser.username,
  );

  const rejectedItemForEvents: RejectedCorpusItemPayload = {
    ...rejectedItem,
    action_screen: actionScreen,
  };

  context.emitReviewedCorpusItemEvent(
    ReviewedCorpusItemEventType.REJECT_ITEM,
    rejectedItemForEvents,
  );

  return rejectedItem;
}
