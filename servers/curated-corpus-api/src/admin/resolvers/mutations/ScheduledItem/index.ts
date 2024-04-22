import { v4 as uuidv4 } from 'uuid';

import { GraphQLError } from 'graphql';

import {
  AuthenticationError,
  NotFoundError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import {
  CuratedCorpusApiErrorCodes,
  parseReasonsCsv,
  sanitizeText,
  ScheduledItemSource,
} from 'content-common';

import config from '../../../../config';
import {
  deleteScheduledItem as dbDeleteScheduledItem,
  createScheduledItem as dbCreateScheduledItem,
  moveScheduledItemToBottom,
} from '../../../../database/mutations';
import { ScheduledItem } from '../../../../database/types';
import {
  ACCESS_DENIED_ERROR,
  ScheduledCorpusItemStatus,
} from '../../../../shared/types';
import {
  getNormalizedDomainName,
  scheduledSurfaceAllowedValues,
} from '../../../../shared/utils';
import {
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
} from '../../../../events/types';
import { IAdminContext } from '../../../context';
import { createTrustedDomainIfPastScheduledDateExists } from '../../../../database/mutations/TrustedDomain';

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
      generated_by: scheduledItem.source as ScheduledItemSource,
      // analytics requires a unique id per action on an existing scheduled
      // item. we create an ephemeral unique id for them here using the same
      // version of UUID that prisma uses. this service has no requirement to
      // retain this id.
      externalId: uuidv4(),
      // so analytics can reference the previous iteration of this item, send
      // the previous unique id here.
      original_scheduled_corpus_item_external_id: scheduledItem.externalId,
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

    // Make this domain trusted if it was scheduled before today.
    // If a domainName is not trusted, then curators are warned that the domain name is new.
    // Doing this update here is a convenient alternative compared with running a daily job.
    // A domain may retain its warning when viewing a historic schedule date,
    // if it is only scheduled on a single day.
    await createTrustedDomainIfPastScheduledDateExists(
      context.db,
      getNormalizedDomainName(scheduledItem.approvedItem.url),
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

/**
 * Reschedules a scheduled item. This can take one of two paths:
 *
 * 1. Rescheduled for the same day ("move to bottom hack") - performs a db
 *  update on the original scheduled item record. Does not send an
 *  analytics event.
 *
 * 2. Rescheduled for a different day - performs a db deletion of the original
 *  scheduled item and creates a new scheduled item in the db with the new
 *  schedule data. Sends an analytics event.
 *
 * @param parent
 * @param param1
 * @param context
 * @returns
 */
export async function rescheduleScheduledItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<ScheduledItem> {
  // separate data coming in from the API into db data (...rescheduleData)
  // and analytics data (actionScreen)
  const { actionScreen, ...rescheduleData } = data;

  // the retuned object
  let rescheduledItem: ScheduledItem;

  // Need to fetch the item first to check access privileges.
  // Note that we do not worry here about an extra hit to the DB
  // as load on this service will be low.
  const item = await context.db.scheduledItem.findUnique({
    where: { externalId: rescheduleData.externalId },
    // we need to retrieve the approved item for its externalId
    include: {
      approvedItem: true,
    },
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

  // if the item is being rescheduled for the same day, it's almost always a
  // "move to bottom" action, so we don't need to emit to snowplow (or do the
  // delete/create steps) - a simple db update is sufficient.
  //
  // sending this data to analytics results in a bad signal, as it isn't a
  // "real" reschedule.
  if (item.scheduledDate.valueOf() === rescheduleData.scheduledDate.valueOf()) {
    rescheduledItem = await moveScheduledItemToBottom(
      context.db,
      {
        externalId: rescheduleData.externalId,
        source: rescheduleData.source,
      },
      context.authenticatedUser.username,
    );
  } else {
    // if this is a "real" reschedule - meaning the dates change, we need to do
    // some processing to help analytics.

    // 1.
    // delete the original item, retaining its externalId for analytics purposes
    const deletedItem = await dbDeleteScheduledItem(context.db, {
      externalId: rescheduleData.externalId,
    });

    // 2.
    // create a new scheduled item with the desired schedule date
    try {
      rescheduledItem = await dbCreateScheduledItem(
        context.db,
        {
          // retain the approved item and scheduled surface from the original scheduled item
          approvedItemExternalId: item.approvedItem.externalId,
          scheduledSurfaceGuid: item.scheduledSurfaceGuid,
          // use the new scheduled date and source coming in from the mutation
          scheduledDate: rescheduleData.scheduledDate,
          source: rescheduleData.source,
        },
        context.authenticatedUser.username,
      );

      // 3.
      // send an event to snowplow
      context.emitScheduledCorpusItemEvent(
        ScheduledCorpusItemEventType.RESCHEDULE,
        {
          scheduledCorpusItem: {
            ...rescheduledItem,
            action_screen: actionScreen,
            generated_by: rescheduleData.source,
            status: ScheduledCorpusItemStatus.RESCHEDULED,
            original_scheduled_corpus_item_external_id: deletedItem.externalId,
          },
        },
      );
    } catch (error) {
      // If it's the duplicate scheduling constraint, catch the error
      // and send a user-friendly one to the client instead.
      if (error.code === 'P2002') {
        throwAlreadyScheduledError(
          rescheduleData.scheduledSurfaceGuid,
          rescheduleData.scheduledDate,
        );
      }

      // If it's something else, throw the error unchanged.
      throw new Error(error);
    }
  }

  return rescheduledItem;
}
