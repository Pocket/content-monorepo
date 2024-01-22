import { PrismaClient } from '@prisma/client';
import {
  ApprovedItem,
  CreateApprovedItemInput,
  ImportApprovedItemInput,
  UpdateApprovedItemAuthorsInput,
  UpdateApprovedItemInput,
} from '../types';
import { UserInputError } from '@pocket-tools/apollo-utils';
import { checkCorpusUrl } from '../helpers/checkCorpusUrl';
import { GraphQLError } from 'graphql';

/**
 * This mutation creates an approved curated item.
 *
 * @param db
 * @param data
 * @param username
 */
export async function createApprovedItem(
  db: PrismaClient,
  data: CreateApprovedItemInput,
  username: string
): Promise<ApprovedItem> {
  // Check if an item with this URL has already been created in the Curated Corpus.
  await checkCorpusUrl(db, data.url);

  return db.approvedItem.create({
    data: {
      ...data,
      // Use the SSO username here.
      createdBy: username,
      // Authors are stored in its own table, so need to have a nested `create`.
      authors: {
        create: data.authors,
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
 * This mutation imports/creates an approved curated item.
 * Due to the nature of the import, we do not throw an
 * error when an approved item already exists
 *
 * @param db
 * @param data
 */
export async function importApprovedItem(
  db: PrismaClient,
  data: ImportApprovedItemInput
): Promise<ApprovedItem> {
  return db.approvedItem.create({
    data,
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });
}

/**
 * This mutation updates an approved curated item.
 *
 * @param db
 * @param data
 * @param username
 */
export async function updateApprovedItem(
  db: PrismaClient,
  data: UpdateApprovedItemInput,
  username: string
): Promise<ApprovedItem> {
  if (!data.externalId) {
    throw new UserInputError('externalId must be provided.');
  }
  return db.approvedItem.update({
    where: { externalId: data.externalId },
    data: {
      ...data,
      // Use the SSO username here.
      updatedBy: username,
      // Authors are stored in their own table, so need to have a nested `create`.
      authors: {
        create: data.authors,
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
 * A targeted update operation that only updates an approved item's authors data.
 * Used to backfill authors for legacy curated items.
 *
 * @param db
 * @param data
 * @param username
 */
export async function updateApprovedItemAuthors(
  db: PrismaClient,
  data: UpdateApprovedItemAuthorsInput,
  username: string
): Promise<ApprovedItem> {
  if (!data.externalId) {
    throw new UserInputError('externalId must be provided.');
  }
  return db.approvedItem.update({
    where: { externalId: data.externalId },
    data: {
      // Use the SSO username here.
      updatedBy: username,
      // Authors are stored in their own table, so need to have a nested `create`.
      authors: {
        create: data.authors,
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
 * This mutation deletes an approved item.
 *
 * @param db
 * @param externalId
 */
export async function deleteApprovedItem(
  db: PrismaClient,
  externalId: string
): Promise<ApprovedItem> {
  // Retrieve the Approved Item first as it needs to be
  // returned to the resolver as the result of the mutation.
  const approvedItem = await db.approvedItem.findUnique({
    where: { externalId },
    include: {
      authors: {
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });

  // Fail early if item wasn't found.
  if (!approvedItem) {
    throw new UserInputError(
      `Could not find an approved item with external id of "${externalId}".`
    );
  }

  // Check for scheduled entries for this approved item.
  const scheduledItems = await db.scheduledItem.findMany({
    where: { approvedItemId: approvedItem.id },
  });
  if (scheduledItems.length > 0) {
    throw new GraphQLError(
      `Cannot remove item from approved corpus - scheduled entries exist.`
    );
  }

  // Delete the authors associated with this approved item.
  await db.approvedItemAuthor.deleteMany({
    where: {
      approvedItemId: approvedItem.id,
    },
  });

  // Hard delete the Approved Item if we got past this point.
  await db.approvedItem.delete({
    where: { externalId },
  });

  return approvedItem;
}
