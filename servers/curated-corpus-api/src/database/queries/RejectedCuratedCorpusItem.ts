import { RejectedCuratedCorpusItem, PrismaClient } from '@prisma/client';
// need this to be able to use Prisma-native types for orderBy and filter clauses
import { Prisma } from '@prisma/client';
import {
  findManyCursorConnection,
  Connection,
} from '@devoxa/prisma-relay-cursor-connection';
import { RejectedCuratedCorpusItemFilter, PaginationInput } from '../types';

/**
 * A dedicated type for the unique cursor value used in the getRejectedCuratedCorpusItems query.
 * Essential to get findManyCursorConnection to work as expected.
 */
type RejectedCuratedCorpusItemCursor = {
  externalId: string;
};

/**
 * Return a Relay-style paginated, optionally filtered list of rejected items.
 *
 * @param db
 * @param pagination
 * @param filters
 */
export async function getRejectedCuratedCorpusItems(
  db: PrismaClient,
  pagination: PaginationInput,
  filters: RejectedCuratedCorpusItemFilter
): Promise<Connection<RejectedCuratedCorpusItem>> {
  // Set up the SQL clauses with our defaults (orderBy) and any filters supplied
  // by the client.
  const baseArgs: Prisma.RejectedCuratedCorpusItemFindManyArgs = {
    orderBy: { createdAt: 'desc' },
    where: constructWhereClauseFromFilters(filters),
  };

  /**
   * Implementation details:
   *
   * The Relay-style pagination implemented for this query is the same as the getApprovedItems query.
   * Detailed comments explaining the callback function below are in ApprovedItem.ts
   */

  return findManyCursorConnection<
    RejectedCuratedCorpusItem,
    RejectedCuratedCorpusItemCursor
  >(
    (args) => db.rejectedCuratedCorpusItem.findMany({ ...args, ...baseArgs }),
    () => db.rejectedCuratedCorpusItem.count({ where: baseArgs.where }),
    pagination,
    {
      getCursor: (record) => ({
        externalId: record.externalId,
      }),
      encodeCursor: (cursor) =>
        Buffer.from(JSON.stringify(cursor)).toString('base64'),
      decodeCursor: (cursor) =>
        JSON.parse(Buffer.from(cursor, 'base64').toString('ascii')),
    }
  );
}

/**
 * Convert the GraphQL filter for rejected curated items into a 'where' clause
 * that Prisma expects to receive.
 *
 * @param filters
 */
const constructWhereClauseFromFilters = (
  filters: RejectedCuratedCorpusItemFilter
): Prisma.RejectedCuratedCorpusItemWhereInput => {
  // Early exit if no filters are provided
  if (!filters) return {};

  return {
    // Exact filters for language, curation status and topic
    language: filters.language ? { equals: filters.language } : undefined,
    topic: filters.topic ? { equals: filters.topic } : undefined,

    // Substring match for title and URL
    title: filters.title ? { contains: filters.title } : undefined,
    url: filters.url ? { contains: filters.url } : undefined,
  };
};

/**
 * Return an approved item with the given URL if found in the Curated Corpus or
 * return null if the url is not found
 *
 * @param db
 * @param url
 */
export async function getRejectedItemByUrl(
  db: PrismaClient,
  url: string
): Promise<RejectedCuratedCorpusItem | null> {
  return db.rejectedCuratedCorpusItem.findUnique({ where: { url } });
}
