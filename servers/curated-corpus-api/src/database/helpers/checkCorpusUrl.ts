import { UserInputError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '.prisma/client';

/**
 * Checks if an item with the given URL already exists in the Curated Corpus database.
 *
 * @param db
 * @param url
 */
export const checkCorpusUrl = async (
  db: PrismaClient,
  url: string
): Promise<void> => {
  // Check if the URL is unique in the Approved Corpus.
  const approvedUrlExists = await db.approvedItem.count({
    where: { url },
  });

  if (approvedUrlExists) {
    throw new UserInputError(
      `An approved item with the URL "${url}" already exists.`
    );
  }

  // Do another check to make sure it hasn't already been added by another user
  // to the Rejected Corpus - an edge case the frontend should never allow but
  // that we should cater for nevertheless.
  const rejectedUrlExists = await db.rejectedCuratedCorpusItem.count({
    where: { url },
  });

  if (rejectedUrlExists) {
    throw new UserInputError(
      `A rejected item with the URL "${url}" already exists.`
    );
  }
};
