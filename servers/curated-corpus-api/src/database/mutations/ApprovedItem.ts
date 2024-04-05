import { PrismaClient } from '.prisma/client';
import {
  ApprovedItem,
  CreateApprovedItemInput,
  UpdateApprovedItemInput,
} from '../types';
import { UserInputError } from '@pocket-tools/apollo-utils';
import { checkCorpusUrl } from '../helpers/checkCorpusUrl';
import { GraphQLError } from 'graphql';
import { getNormalizedDomainName } from '../../shared/utils';
import retry from 'async-retry';

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
  username: string,
): Promise<ApprovedItem> {
  return retry(
    async (bail, attempt) => {
      try {
        // Attempt to create the approved item without retry logic.
        return await createApprovedItemWithoutRetry(db, data, username);
      } catch (error) {
        if (error.code === 'P2002') {
          // Concurrent inserts with the same domain cause a unique constraint failure.
          // Prisma recommends retrying: https://www.prisma.io/docs/orm/reference/prisma-client-reference#connectorcreate
          console.log(
            `Attempt ${attempt}: Unique constraint violation. Retrying...`,
          );
          throw error;
        } else {
          // For all other errors, do not retry.
          bail(error);
        }
      }
    },
    {
      retries: 3, // Maximum number of retries.
      factor: 2, // The exponential factor.
      minTimeout: 500, // The number of milliseconds before starting the first retry.
      onRetry: (error, attempt) => {
        console.log(`Retry attempt ${attempt} due to error: ${error.message}`);
      },
    },
  );
}

/**
 * This tries to create an ApprovedItem without retrying on failure, and should
 * therefore probably not be used directly. Use createApprovedItem instead.
 */
async function createApprovedItemWithoutRetry(
  db: PrismaClient,
  data: CreateApprovedItemInput,
  username: string,
): Promise<ApprovedItem> {
  // Check if an item with this URL has already been created in the Curated Corpus.
  await checkCorpusUrl(db, data.url);

  const domainName = getNormalizedDomainName(data.url);

  return db.approvedItem.create({
    data: {
      ...data,
      domain: {
        connectOrCreate: {
          create: { domainName },
          where: { domainName },
        },
      },
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
 * This mutation updates an approved curated item.
 *
 * @param db
 * @param data
 * @param username
 */
export async function updateApprovedItem(
  db: PrismaClient,
  data: UpdateApprovedItemInput,
  username: string,
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
 * This mutation deletes an approved item.
 *
 * @param db
 * @param externalId
 */
export async function deleteApprovedItem(
  db: PrismaClient,
  externalId: string,
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
      `Could not find an approved item with external id of "${externalId}".`,
    );
  }

  // Check for scheduled entries for this approved item.
  const scheduledItems = await db.scheduledItem.findMany({
    where: { approvedItemId: approvedItem.id },
  });

  if (scheduledItems.length > 0) {
    throw new GraphQLError(
      `Cannot remove item from approved corpus - scheduled entries exist.`,
    );
  }

  // Delete the authors associated with this approved item.
  await db.approvedItemAuthor.deleteMany({
    where: {
      approvedItemId: approvedItem.id,
    },
  });

  // Hard delete the Approved Item if we got to this point.
  await db.approvedItem.delete({
    where: { externalId },
  });

  return approvedItem;
}
