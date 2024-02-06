import {
  deleteScheduledItem as dbDeleteScheduledItem,
  createScheduledItem as dbCreateScheduledItem,
  rescheduleScheduledItem as dbRescheduleScheduledItem,
} from '../../../database/mutations';
import { ScheduledItem } from '../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../shared/types';
import { scheduledSurfaceAllowedValues } from '../../../shared/utils';
import { ScheduledCorpusItemEventType } from '../../../events/types';
import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
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

  // Before we send the event to Snowplow, update the `updatedBy` and `updatedAt` fields
  // as the object returned from the database resolver will have the details
  // of the previous update and not the final one (aka the hard delete).
  scheduledItem.updatedBy = context.authenticatedUser.username;

  // The date is already in UTC - excellent! The relevant SnowplowHandler class
  // will transform it into a Unix timestamp before sending it as part of the Snowplow
  // event data.
  scheduledItem.updatedAt = new Date();

  context.emitScheduledCorpusItemEvent(
    ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    scheduledItem,
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
  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Check if the specified Scheduled Surface GUID actually exists.
  if (!scheduledSurfaceAllowedValues.includes(data.scheduledSurfaceGuid)) {
    throw new UserInputError(
      `Cannot create a scheduled entry with Scheduled Surface GUID of "${data.scheduledSurfaceGuid}".`,
    );
  }

  try {
    const scheduledItem = await dbCreateScheduledItem(
      context.db,
      data,
      context.authenticatedUser.username,
    );

    context.emitScheduledCorpusItemEvent(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
      scheduledItem,
    );

    return scheduledItem;
  } catch (error) {
    // If it's the duplicate scheduling constraint, catch the error
    // and send a user-friendly one to the client instead.
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new UserInputError(
        `This story is already scheduled to appear on ${
          data.scheduledSurfaceGuid
        } on ${data.scheduledDate.toLocaleString('en-US', {
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
      rescheduledItem,
    );

    return rescheduledItem;
  } catch (error) {
    // If it's the duplicate scheduling constraint, catch the error
    // and send a user-friendly one to the client instead.
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
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
