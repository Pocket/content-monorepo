import { PrismaClient } from '.prisma/client';
import { DateTime } from 'luxon';
import {
  ScheduledItem,
  ScheduledItemFilterInput,
  ScheduledItemsResult,
  ScheduledSurfaceItem,
} from '../types';
import {
  getCorpusItemFromApprovedItem,
  scheduledSurfaceAllowedValues,
} from '../../shared/utils';
import { groupBy } from '../../shared/utils';
import { UserInputError } from '@pocket-tools/apollo-utils';

/**
 * @param db
 * @param filters
 */
export async function getScheduledItems(
  db: PrismaClient,
  filters: ScheduledItemFilterInput,
  includeHasTrustedDomain: boolean,
): Promise<ScheduledItemsResult[]> {
  const { scheduledSurfaceGuid, startDate, endDate } = filters;

  // validate scheduledSurfaceGuid
  if (!scheduledSurfaceAllowedValues.includes(scheduledSurfaceGuid)) {
    throw new UserInputError(
      `${scheduledSurfaceGuid} is not a valid Scheduled Surface GUID`,
    );
  }

  // Get a flat array of scheduled items from Prisma
  const items = await db.scheduledItem.findMany({
    // we need to order by scheduleDate first, as we perform a programmatic
    // groupBy below on that field
    orderBy: [{ scheduledDate: 'asc' }, { updatedAt: 'asc' }],
    where: {
      scheduledSurfaceGuid: { equals: scheduledSurfaceGuid },
      scheduledDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
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

  // Group scheduled items into an array of arrays.
  const groupedItems = groupBy(items, 'scheduledDate');

  // Transform the grouped scheduled items into the return result
  // of the right shape.
  const results: ScheduledItemsResult[] = groupedItems.map(
    (items: ScheduledItem[]) => {
      // Format the scheduled date to YYYY-MM-DD format
      // the resolver expects to return.
      const scheduledDate = DateTime.fromJSDate(items[0].scheduledDate, {
        zone: 'utc',
      }).toFormat('yyyy-MM-dd');

      return {
        scheduledDate,
        collectionCount: items.filter(
          (item) => item.approvedItem.isCollection === true,
        ).length,
        syndicatedCount: items.filter(
          (item) => item.approvedItem.isSyndicated === true,
        ).length,
        totalCount: items.length,
        items: items,
      };
    },
  );

  // Check if we need to include trusted domain information
  if (includeHasTrustedDomain) {
    // Extract domain names from approvedItems
    const domainNames = items.map((item) => item.approvedItem.domainName);

    // Find all trusted domains for the domain names extracted
    const trustedDomains = await db.trustedDomain.findMany({
      where: {
        domainName: { in: domainNames },
      },
    });

    // Create a map of domainName to trusted status
    const trustedDomainsMap = trustedDomains.reduce((acc, trustedDomain) => {
      acc[trustedDomain.domainName] = true;
      return acc;
    }, {});

    // Set hasTrustedDomain in results
    results.map((result: ScheduledItemsResult) => {
      result.items.map((item) => {
        item.approvedItem.hasTrustedDomain =
          trustedDomainsMap[item.approvedItem.domainName] || false;
      });
    });
  }

  return results;
}

/**
 * Gets a list of scheduled items for a combination of a given scheduled surface
 * (e.g., New Tab) and a date in YYYY-MM-DD format.
 *
 * @param db
 * @param id
 * @param date
 */
export async function getItemsForScheduledSurface(
  db: PrismaClient,
  id: string,
  date: string,
): Promise<ScheduledSurfaceItem[]> {
  // Get a flat array of scheduled items from Prisma
  const items = await db.scheduledItem.findMany({
    orderBy: { updatedAt: 'asc' },
    where: {
      scheduledSurfaceGuid: { equals: id },
      scheduledDate: date,
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

  // Convert these items into the expected query result:
  // ScheduledSurfaceItem & CorpusItem
  return items.map((scheduledItem) => {
    const item: ScheduledSurfaceItem = {
      id: scheduledItem.externalId,
      surfaceId: scheduledItem.scheduledSurfaceGuid,
      scheduledDate: DateTime.fromJSDate(scheduledItem.scheduledDate, {
        zone: 'utc',
      }).toFormat('yyyy-MM-dd'),
      corpusItem: getCorpusItemFromApprovedItem(scheduledItem.approvedItem),
    };
    return item;
  });
}

/**
 * Get scheduled item with attributes that define it as unique
 * @param db
 * @param data
 */
export async function getScheduledItemByUniqueAttributes(
  db: PrismaClient,
  data,
): Promise<ScheduledItem | null> {
  return db.scheduledItem.findUnique({
    where: {
      ItemScheduledSurfaceDate: {
        approvedItemId: data.approvedItemId,
        scheduledSurfaceGuid: data.scheduledSurfaceGuid,
        scheduledDate: data.scheduledDate,
      },
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
