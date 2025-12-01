import { GraphQLError } from 'graphql';
import { ForbiddenError, UserInputError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '.prisma/client';

import {
  ApprovedItem,
  CreateApprovedItemInput,
  UpdateApprovedItemInput,
} from '../types';
import { checkCorpusUrl } from '../helpers/checkCorpusUrl';
import { getDomainFromUrl, validateHttpUrl } from '../../shared/utils';
import { isExcludedDomain } from './ExcludedDomain';
import { lookupPublisher } from './PublisherDomain';
import { deleteSectionItemsByApprovedItemId } from './SectionItem';

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
  // Check if an item with this URL has already been created in the Curated Corpus.
  await checkCorpusUrl(db, data.url);

  // Validate URL is http(s) before processing
  validateHttpUrl(data.url);

  const domainName = getDomainFromUrl(data.url);

  // Look up this story in the excluded domains list.
  const isExcluded = await isExcludedDomain(db, domainName);

  // Do not proceed with creating a corpus item if this domain is excluded.
  if (isExcluded) {
    throw new ForbiddenError(
      `Cannot schedule this story: "${domainName}" is on the excluded domains list.`,
    );
  }

  // Derive publisher if not provided (or empty string).
  // Lookup order: subdomain -> registrable domain -> fallback to hostname.
  let publisher = data.publisher;
  if (!publisher) {
    publisher = await lookupPublisher(db, data.url);
    if (!publisher) {
      // Fallback to hostname (domainName) if no match in PublisherDomain
      publisher = domainName;
    }
  }

  return db.approvedItem.create({
    data: {
      ...data,
      publisher,
      domainName,
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
 * This mutation deletes an approved item, as well as all associated
 * SectionItems.
 *
 * @param db
 * @param externalId
 * @returns ApprovedItem - the deleted ApprovedItem
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

  // delete all SectionItems based on this ApprovedItem
  await deleteSectionItemsByApprovedItemId(db, approvedItem.id);

  // Hard delete the Approved Item if we got to this point.
  await db.approvedItem.delete({
    where: { externalId },
  });

  return approvedItem;
}
