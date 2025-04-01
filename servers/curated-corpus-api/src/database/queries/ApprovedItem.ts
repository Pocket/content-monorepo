// need this to be able to use Prisma-native types for orderBy and filter clauses
import * as prisma from '.prisma/client';

import {
  ApprovedItem as PrismaApprovedItem,
  PrismaClient,
} from '.prisma/client';

import {
  Connection,
  findManyCursorConnection,
} from '@devoxa/prisma-relay-cursor-connection';

import { DateTime } from 'luxon';

import {
  ApprovedItem,
  ApprovedItemFilter,
  ApprovedItemScheduledSurfaceHistory,
  PaginationInput,
} from '../types';

/**
 * A dedicated type for the unique cursor value used in the getCuratedItems query.
 * Essential to get findManyCursorConnection to work as expected.
 */
type ApprovedItemCursor = {
  externalId: string;
};

/**
 * Return ApprovedItems for a given domain name.
 *
 * @param db
 * @param domainName
 */
export async function getApprovedItemsForDomain(
  db: PrismaClient,
  domainName: string
): Promise<ApprovedItem[]> {
  return db.approvedItem.findMany({
    where: {
      OR: [
        { url: { startsWith: `https://${domainName}` } },
        { url: { startsWith: `http://${domainName}` } },
        { url: { startsWith: `https://www.${domainName}` } },
        { url: { startsWith: `http://www.${domainName}` } },
      ],
    },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * Return a Relay-style paginated, optionally filtered list of approved items.
 *
 * @param db
 * @param pagination
 * @param filters
 */
export async function getApprovedItems(
  db: PrismaClient,
  pagination: PaginationInput,
  filters: ApprovedItemFilter,
): Promise<Connection<ApprovedItem>> {
  // Set up the SQL clauses with our defaults (orderBy) and any filters supplied
  // by the client.
  const baseArgs: prisma.Prisma.ApprovedItemFindManyArgs = {
    orderBy: { createdAt: 'desc' },
    where: constructWhereClauseFromFilters(filters),
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  };

  // Unleash the full potential of the below function that extends Prisma's own `findMany`.
  //
  // This helper function returns a list of ApprovedItem edges alongside a `totalCount` value
  // and a `pageInfo` object (see type above in the promise returned: `Connection<ApprovedItem>`)
  // that matches what the GraphQL server expects to provide to the client perfectly.
  //
  // Step 1: Provide at least two types - ApprovedItem as the record/entity we're using, and
  // ApprovedItemCursor defined at the top of this file to specify a custom field for the cursor.
  return findManyCursorConnection<
    // this is the type returned by Step 2 below - it must be a native Prisma type
    PrismaApprovedItem,
    ApprovedItemCursor,
    // this is the type we need to conform to for each node to satisfy the graphql
    // schema (which uses our custom ApprovedItem type (that contains authors))
    // (afaict - the docs aren't great)
    ApprovedItem,
    // this is the return structure of this function
    // (afaict - the docs aren't great)
    {
      cursor: string;
      node: ApprovedItem;
    }
  >(
    // Step 2: the function will generate cursor/take/skip arguments for us in `args`,
    // need to add our own to that.
    (args) => {
      return db.approvedItem.findMany({
        ...args,
        ...baseArgs,
      });
    },
    () => db.approvedItem.count({ where: baseArgs.where }),
    // Step 3: Pass the PaginationInput here exactly as it arrives all the way from
    // the query - the types are 100% compatible.
    pagination,
    // Step 4: Provide additional options.
    {
      // Option 1: The default cursor is the `id` field of the record.
      // We don't expose the numeric ID of each Approved Item. Use `externalId`
      // instead, which is also a unique field.
      getCursor: (record) => ({
        externalId: record.externalId,
      }),
      // Option 2: Callback function that encodes the cursor before returning
      // the response object to the resolver function and then on to the client.
      encodeCursor: (cursor) =>
        Buffer.from(JSON.stringify(cursor)).toString('base64'),
      // Option 3: Callback function that decodes the cursor that may be passed in
      // as part of `pagination` variables (either `before` or `after`) before
      // sending it along as the now-decoded `externalId` value to Prisma.
      decodeCursor: (cursor) =>
        JSON.parse(Buffer.from(cursor, 'base64').toString('ascii')),
      // to conform to the custom, non-prisma type, we need to explicitly define
      // the structure of each node.
      recordToEdge: (record) => {
        return {
          // typescript is making this more difficult than it needs to be. authors
          // is returned based on `baseArgs` above, but because this property isn't
          // in the prisma ApprovedItem type, we have to cast the variable as our
          // custom ApprovedItem type (which *does* contain authors data).
          node: record as ApprovedItem,
        };
      },
    },
  );
}

/**
 * Return an approved item with the given URL if found in the Curated Corpus or
 * return null if the url is not found
 *
 * @param db
 * @param url
 */
export async function getApprovedItemByUrl(
  db: PrismaClient,
  url: string,
): Promise<ApprovedItem | null> {
  return db.approvedItem.findUnique({
    where: { url },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * Return an approved item with the given external ID if found in the Curated Corpus
 * or null otherwise.
 *
 * @param db
 * @param externalId
 */
export async function getApprovedItemByExternalId(
  db: PrismaClient,
  externalId: string,
): Promise<ApprovedItem | null> {
  return db.approvedItem.findUnique({
    where: { externalId },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * Return approved items with the given external IDs if found in the Curated Corpus
 * or null otherwise.
 *
 * @param db PrismaClient
 * @param externalIds an array of string GUIDs
 */
export async function getApprovedItemsByExternalIds(
  db: PrismaClient,
  externalIds: string[],
): Promise<ApprovedItem[]> {
  return await db.approvedItem.findMany({
    where: {
      externalId: {
        in: externalIds,
      },
    },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * Return approved items with the given urls if found in the Curated Corpus
 * or null otherwise.
 *
 * @param db PrismaClient
 * @param urls an array of string urls
 */
export async function getApprovedItemsByUrls(
  db: PrismaClient,
  urls: string[],
): Promise<ApprovedItem[]> {
  return db.approvedItem.findMany({
    where: {
      url: {
        in: urls,
      },
    },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * Return a list of scheduled entries for an Approved Item with a given externalID.
 *
 * @param db
 * @param externalId
 * @param scheduledSurfaceGuid
 * @param limit
 */
export async function getScheduledSurfaceHistory(
  db: PrismaClient,
  externalId: string,
  scheduledSurfaceGuid?: string,
  limit?: number,
): Promise<ApprovedItemScheduledSurfaceHistory[]> {
  const approvedItem = await db.approvedItem.findUnique({
    where: { externalId },
  });

  // Early exit if no approved item is found.
  // This is never supposed to happen since it's a subquery
  // on the ApprovedItem, but it does solve the issue of not
  // needing a non-null assertion in the Prisma query below :).
  if (!approvedItem) {
    return [];
  }

  const result = await db.scheduledItem.findMany({
    take: limit,
    orderBy: { scheduledDate: 'desc' },
    where: {
      approvedItemId: approvedItem.id,
      scheduledSurfaceGuid: scheduledSurfaceGuid
        ? { equals: scheduledSurfaceGuid }
        : undefined,
    },
    select: {
      // Only select the fields we need for the return type
      externalId: true,
      createdBy: true,
      scheduledDate: true,
      scheduledSurfaceGuid: true,
    },
  });

  // Mould the result into the shape the resolver expects to return.
  return result.map((item) => {
    return {
      ...item,
      // Format the scheduled date to YYYY-MM-DD format
      scheduledDate: DateTime.fromJSDate(item.scheduledDate, {
        zone: 'utc',
      }).toFormat('yyyy-MM-dd'),
    };
  });
}

/**
 * Convert the GraphQL filter for approved items into a 'where' clause
 * that Prisma expects to receive.
 *
 * @param filters
 */
const constructWhereClauseFromFilters = (
  filters: ApprovedItemFilter,
): prisma.Prisma.ApprovedItemWhereInput => {
  // Get out quickly if no filters have been provided.
  if (!filters) return {};

  return {
    // Exact filters for language, curation status and topic
    language: filters.language ? { equals: filters.language } : undefined,
    status: filters.status ? { equals: filters.status } : undefined,
    topic: filters.topic ? { equals: filters.topic } : undefined,

    // Substring match for title and URL
    title: filters.title ? { contains: filters.title } : undefined,
    url: filters.url ? { contains: filters.url } : undefined,
  };
};
