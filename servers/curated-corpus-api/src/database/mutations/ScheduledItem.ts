import { PrismaClient } from '.prisma/client';

import { CreateScheduledItemInput } from 'content-common';

import {
  DeleteScheduledItemInput,
  MoveScheduledItemToBottomInput,
  ScheduledItem,
} from '../types';
import { ForbiddenError, NotFoundError } from '@pocket-tools/apollo-utils';
import { isExcludedDomain } from './ExcludedDomain';

/**
 * This mutation adds a scheduled entry for a Scheduled Surface.
 *
 * @param db
 * @param data
 * @param username
 */
export async function createScheduledItem(
  db: PrismaClient,
  data: CreateScheduledItemInput,
  username: string,
): Promise<ScheduledItem> {
  const {
    approvedItemExternalId,
    scheduledSurfaceGuid,
    scheduledDate,
    source,
  } = data;

  const approvedItem = await db.approvedItem.findUnique({
    where: { externalId: approvedItemExternalId },
  });

  if (!approvedItem) {
    throw new NotFoundError(
      `Cannot create a scheduled entry: Approved Item with id "${approvedItemExternalId}" does not exist.`,
    );
  }

  // Look up this story in the excluded domains list.
  const isExcluded = await isExcludedDomain(db, approvedItem.domainName);

  // Do not proceed with scheduling if this domain is excluded.
  if (isExcluded) {
    throw new ForbiddenError(
      `Cannot schedule this story: "${approvedItem.domainName}" is on the excluded domains list.`,
    );
  }

  return await db.scheduledItem.create({
    data: {
      approvedItemId: approvedItem.id,
      scheduledSurfaceGuid,
      scheduledDate,
      createdBy: username,
      source,
    },
    include: {
      approvedItem: {
        include: {
          authors: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      },
    },
  });
}

/**
 * This mutation deletes a scheduled entry for a Scheduled Surface.
 *
 * @param db
 * @param data
 */
export async function deleteScheduledItem(
  db: PrismaClient,
  data: DeleteScheduledItemInput,
): Promise<ScheduledItem> {
  return await db.scheduledItem.delete({
    where: {
      externalId: data.externalId,
    },
    include: {
      approvedItem: {
        include: {
          authors: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      },
    },
  });
}

/**
 * the business purpose of this function is to set `updatedAt` to the current
 * timestamp in order to affect the sort order (which is `updatedAt ASC`) on
 * the schedule screen in the admin tool.
 *
 * the use-case for this function is for editors to be able to sort items for
 * pocket hits (for which sort order matters), though it has been said that
 * some editors also use this as an ad-hoc visual organizing tool.
 *
 * the `updatedBy` and `source` columns are also updated for analytics
 * purposes.
 *
 * @param db PrismaClient
 * @param data data to filter by/update
 * @param username the SSO name of the entity performing the update
 * @returns ScheduledItem
 */
export async function moveScheduledItemToBottom(
  db: PrismaClient,
  data: MoveScheduledItemToBottomInput,
  username: string,
): Promise<ScheduledItem> {
  return await db.scheduledItem.update({
    where: { externalId: data.externalId },
    data: {
      updatedBy: username,
      source: data.source,
    },
    include: {
      approvedItem: {
        include: {
          authors: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      },
    },
  });
}
