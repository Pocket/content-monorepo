import {
  CuratedCorpusApiErrorCodes,
  parseReasonsCsv,
  sanitizeText,
  ScheduledItemSource,
} from 'content-common';

import config from '../../../config';

import {
  deleteScheduledItem as dbDeleteScheduledItem,
  createScheduledItem as dbCreateScheduledItem,
  rescheduleScheduledItem as dbRescheduleScheduledItem,
} from '../../../database/mutations';
import { ScheduledItem } from '../../../database/types';
import {
  ACCESS_DENIED_ERROR,
  ScheduledCorpusItemStatus,
} from '../../../shared/types';
import { scheduledSurfaceAllowedValues } from '../../../shared/utils';
import {
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
} from '../../../events/types';
import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { NotFoundError } from '@pocket-tools/apollo-utils';
import { IAdminContext } from '../../context';
import { GraphQLError } from 'graphql';

/**
 * Deletes an item from the Scheduled Surface schedule.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function deleteScheduledItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ScheduledItem> {
  const { reasons, reasonComment, actionScreen, ...deleteScheduleData } = data;

  // Need to fetch the item first to check access privileges.
  // Note that we do not worry here about an extra hit to the DB
  // as load on this service will be low.
  const item = await context.db.scheduledItem.findUnique({
    where: { externalId: deleteScheduleData.externalId },
  });

  if (!item) {
    throw new NotFoundError(
      `Item with ID of '${deleteScheduleData.externalId}' could not be found.`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(item.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Access allowed, proceed as normal from this point on.
  const scheduledItem = await dbDeleteScheduledItem(
    context.db,
    deleteScheduleData,
  );

  // The date is already in UTC - excellent! The relevant SnowplowHandler class
  // will transform it into a Unix timestamp before sending it as part of the Snowplow
  // event data.
  scheduledItem.updatedAt = new Date();

  // Before we send the event to Snowplow, update the `updatedBy` and `updatedAt` fields
  // as the object returned from the database resolver will have the details
  // of the previous update and not the final one (aka the hard delete).
  scheduledItem.updatedBy = context.authenticatedUser.username;

  // build an extended copy of the returned scheduledItem which will include
  // additional event tracking info
  const scheduledItemForEvents: ScheduledCorpusItemPayload = {
    scheduledCorpusItem: {
      ...scheduledItem,
      action_screen: actionScreen,
      // TODO: should source be a part of the mutation input?
      generated_by: scheduledItem.source as ScheduledItemSource,
      // get reasons and reason comment (these may both be null. they're only
      // supplied when a scheduled item is deleted for a limited set of surfaces)
      reasons: parseReasonsCsv(reasons, config.app.removeReasonMaxLength),
      reasonComment: reasonComment
        ? sanitizeText(reasonComment, config.app.removeReasonMaxLength)
        : null,
      status: ScheduledCorpusItemStatus.REMOVED,
    },
  };

  context.emitScheduledCorpusItemEvent(
    ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    scheduledItemForEvents,
  );

  return scheduledItem;
}

function throwAlreadyScheduledError(
  scheduledSurfaceGuid: string,
  scheduledDate: Date,
) {
  throw new GraphQLError(
    `This story is already scheduled to appear on ${scheduledSurfaceGuid} on ${scheduledDate.toLocaleString(
      'en-US',
      {
        dateStyle: 'medium',
        timeZone: 'UTC',
      },
    )}.`,
    {
      extensions: { code: CuratedCorpusApiErrorCodes.ALREADY_SCHEDULED },
    },
  );
}

/**
 * Adds a curated item to a scheduled surface for a given date.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function createScheduledItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ScheduledItem> {
  const { reasons, reasonComment, actionScreen, ...scheduledItemData } = data;

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Check if the specified Scheduled Surface GUID actually exists.
  if (!scheduledSurfaceAllowedValues.includes(data.scheduledSurfaceGuid)) {
    throw new UserInputError(
      `Cannot create a scheduled entry with Scheduled Surface GUID of "${scheduledItemData.scheduledSurfaceGuid}".`,
    );
  }

  try {
    const scheduledItem = await dbCreateScheduledItem(
      context.db,
      scheduledItemData,
      context.authenticatedUser.username,
    );

    // build an extended copy of the returned scheduledItem which will include
    // additional event tracking info
    const scheduledItemForEvents: ScheduledCorpusItemPayload = {
      scheduledCorpusItem: {
        ...scheduledItem,
        action_screen: actionScreen,
        generated_by: scheduledItemData.source,
        // get reasons and reason comment for adding a scheduled item.
        // (these may both be null. they're only supplied when an item was
        // scheduled manually for limited surfaces.)
        reasons: parseReasonsCsv(reasons, config.app.removeReasonMaxLength),
        reasonComment: data.reasonComment
          ? sanitizeText(reasonComment, config.app.removeReasonMaxLength)
          : null,
        status: ScheduledCorpusItemStatus.ADDED,
      },
    };

    context.emitScheduledCorpusItemEvent(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
      scheduledItemForEvents,
    );

    return scheduledItem;
  } catch (error) {
    // If it's the duplicate scheduling constraint, catch the error
    // and send a user-friendly one to the client instead.
    if (error.code === 'P2002') {
      throwAlreadyScheduledError(
        scheduledItemData.scheduledSurfaceGuid,
        scheduledItemData.scheduledDate,
      );
    }

    // If it's something else, throw the error unchanged.
    throw error;
  }
}

export async function rescheduleScheduledItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ScheduledItem> {
  const { actionScreen, ...rescheduleData } = data;

  // Need to fetch the item first to check access privileges.
  // Note that we do not worry here about an extra hit to the DB
  // as load on this service will be low.
  const item = await context.db.scheduledItem.findUnique({
    where: { externalId: rescheduleData.externalId },
  });

  if (!item) {
    throw new NotFoundError(
      `Item with ID of '${rescheduleData.externalId}' could not be found.`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(item.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  try {
    const rescheduledItem = await dbRescheduleScheduledItem(
      context.db,
      rescheduleData,
      context.authenticatedUser.username,
    );

    // We should only to emit a reschedule event if the scheduledDate changes.
    // The curation admin tools use the reschedule mutation as a hack for moveToBottom, and it
    // resulted in bad signal for ML/analytics when we emitted a reschedule event for this action.
    if (
      item.scheduledDate.valueOf() != rescheduledItem.scheduledDate.valueOf()
    ) {
      context.emitScheduledCorpusItemEvent(
        ScheduledCorpusItemEventType.RESCHEDULE,
        {
          scheduledCorpusItem: {
            ...rescheduledItem,
            action_screen: actionScreen,
          },
        },
      );
    }

    return rescheduledItem;
  } catch (error) {
    // If it's the duplicate scheduling constraint, catch the error
    // and send a user-friendly one to the client instead.
    if (error.code === 'P2002') {
      throwAlreadyScheduledError(item.scheduledSurfaceGuid, data.scheduledDate);
    }
    // If it's something else, throw the error unchanged.
    throw new Error(error);
  }
}
