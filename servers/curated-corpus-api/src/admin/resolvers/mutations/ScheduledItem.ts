import {
  CorpusItemSource,
  parseReasonsCsv,
  sanitizeText,
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
  // Need to fetch the item first to check access privileges.
  // Note that we do not worry here about an extra hit to the DB
  // as load on this service will be low.
  const item = await context.db.scheduledItem.findUnique({
    where: { externalId: data.externalId },
  });

  if (!item) {
    throw new NotFoundError(
      `Item with ID of '${data.externalId}' could not be found.`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(item.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Access allowed, proceed as normal from this point on.
  const scheduledItem = await dbDeleteScheduledItem(context.db, data);

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
      status: ScheduledCorpusItemStatus.REMOVED,
      // hard-coded to manual for now. once MC-645 is complete, this should be pulled from
      // the `scheduledItem.source` property.
      generated_by: CorpusItemSource.MANUAL,
      // get reasons and reason comment (these may both be null. they're only
      // supplied when a scheduled item is deleted for a limited set of surfaces)
      reasons: parseReasonsCsv(data.reasons, config.app.removeReasonMaxLength),
      reasonComment: data.reasonComment
        ? sanitizeText(data.reasonComment, config.app.removeReasonMaxLength)
        : null,
    },
  };

  context.emitScheduledCorpusItemEvent(
    ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    scheduledItemForEvents,
  );

  return scheduledItem;
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
  const {
    manaulScheduleReasons,
    manualScheduleReasonComment,
    ...scheduledItemData
  } = data;

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
        status: ScheduledCorpusItemStatus.ADDED,
        generated_by: scheduledItemData.source,
        // get reasons and reason comment. (these may both be null. they're only
        // supplied when an item was scheduled manually for limited surfaces.)
        manualScheduleReasons: parseReasonsCsv(
          manaulScheduleReasons,
          config.app.removeReasonMaxLength,
        ),
        // eslint cannot decide what it wants below - it complains about
        // indentation no matter what i do, so i'm skipping it 🙃
        /* eslint-disable */
        manualScheduleReasonsComment: manualScheduleReasonComment
          ? sanitizeText(
              manualScheduleReasonComment,
              config.app.removeReasonMaxLength,
            )
          : null,
        /* eslint-enable */
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
    // Prisma P2002 error: "Unique constraint failed on the {constraint}"
    if (
      error.code === 'P2002'
    ) {
      throw new UserInputError(
        `This story is already scheduled to appear on ${
          scheduledItemData.scheduledSurfaceGuid
        } on ${scheduledItemData.scheduledDate.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        })}.`,
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
  // Need to fetch the item first to check access privileges.
  // Note that we do not worry here about an extra hit to the DB
  // as load on this service will be low.
  const item = await context.db.scheduledItem.findUnique({
    where: { externalId: data.externalId },
  });

  if (!item) {
    throw new NotFoundError(
      `Item with ID of '${data.externalId}' could not be found.`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(item.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  try {
    const rescheduledItem = await dbRescheduleScheduledItem(
      context.db,
      data,
      context.authenticatedUser.username,
    );

    context.emitScheduledCorpusItemEvent(
      ScheduledCorpusItemEventType.RESCHEDULE,
      {
        scheduledCorpusItem: rescheduledItem,
      },
    );
    return rescheduledItem;
  } catch (error) {
    // If it's the duplicate scheduling constraint, catch the error
    // and send a user-friendly one to the client instead.
    // Prisma P2002 error: "Unique constraint failed on the {constraint}"
    if (error.code === 'P2002') {
      throw new UserInputError(
        `This story is already scheduled to appear on ${data.scheduledDate.toLocaleString(
          'en-US',
          {
            dateStyle: 'medium',
            timeZone: 'UTC',
          },
        )}.`,
      );
    }
    // If it's something else, throw the error unchanged.
    throw new Error(error);
  }
}
