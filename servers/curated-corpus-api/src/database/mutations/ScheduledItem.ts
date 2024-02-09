import { PrismaClient } from '@prisma/client';
import {
  CreateScheduledItemInput,
  DeleteScheduledItemInput,
  ImportScheduledItemInput,
  RescheduleScheduledItemInput,
  ScheduledItem,
} from '../types';
import { NotFoundError } from '@pocket-tools/apollo-utils';

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
  const { approvedItemExternalId } = data;

  const approvedItem = await db.approvedItem.findUnique({
    where: { externalId: approvedItemExternalId },
  });

  if (!approvedItem) {
    throw new NotFoundError(
      `Cannot create a scheduled entry: Approved Item with id "${approvedItemExternalId}" does not exist.`,
    );
  }

  return await db.scheduledItem.create({
    data: constructCreateScheduleItemData(approvedItem.id, data, username),
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
 * Create (import) a scheduled item for a given approved item
 * @param db
 * @param data
 */
export async function importScheduledItem(
  db: PrismaClient,
  data: ImportScheduledItemInput,
): Promise<ScheduledItem> {
  return db.scheduledItem.create({
    data,
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

export async function rescheduleScheduledItem(
  db: PrismaClient,
  data: RescheduleScheduledItemInput,
  username: string,
): Promise<ScheduledItem> {
  return await db.scheduledItem.update({
    where: { externalId: data.externalId },
    data: {
      scheduledDate: data.scheduledDate,
      updatedBy: username,
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
 * Construct the data object based on input parameters provided
 *
 * @param approvedItemId
 * @param inputData
 * @param username
 */
const constructCreateScheduleItemData = (
  approvedItemId: number,
  inputData: CreateScheduledItemInput,
  username: string,
) => {
  const { scheduledSurfaceGuid, scheduledDate, source } = inputData;

  const defaultCreateData = {
    approvedItemId,
    scheduledSurfaceGuid,
    scheduledDate,
    createdBy: username,
  };

  if (!source) {
    return defaultCreateData;
  }

  return {
    ...defaultCreateData,
    source,
  };
};
