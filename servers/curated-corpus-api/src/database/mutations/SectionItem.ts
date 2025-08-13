import { NotFoundError } from '@pocket-tools/apollo-utils';

import { PrismaClient } from '.prisma/client';

import { CreateSectionItemInput, RemoveSectionItemInput, SectionItem } from '../types';
import { ActivitySource } from 'content-common';

/**
 * This mutation creates a SectionItem & adds it to a Section
 *
 * @param db
 * @param data
 */
export async function createSectionItem(
  db: PrismaClient,
  data: CreateSectionItemInput,
): Promise<SectionItem> {
  // we verify the Section/sectionId in the upstream resolver, so no need to
  // do so again here
  const { sectionId, approvedItemExternalId, rank } = data;

  // make sure the targeted ApprovedItem exists
  const approvedItem = await db.approvedItem.findUnique({
    where: { externalId: approvedItemExternalId },
  });

  if (!approvedItem) {
    throw new NotFoundError(
      `Cannot create a section item: ApprovedItem with id "${approvedItemExternalId}" does not exist.`,
    );
  }

  const createData = {
    approvedItemId: approvedItem.id,
    sectionId,
    rank,
  };

  return await db.sectionItem.create({
    data: createData,
    // for the initial implementation (ML-generated Sections only), i don't
    // think we have a need for the associated ApprovedItem. however, when we
    // allow editors to create Sections, we most certainly will. usage on this
    // mutation shouldn't be so high that we need to optimize db selects, so
    // leaving this in.
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
 * This mutation removes a SectionItem from a Section.
 * The SectionItem is marked as in-active, `deactivatedBy` it set to MANUAL,
 * `deactivatedAt` Date is set & deactivateReasons is set.
 *
 * @param db
 * @param data
 */
export async function removeSectionItem(
  db: PrismaClient,
  data: RemoveSectionItemInput,
): Promise<SectionItem> {
  // Construct the data to remove SectionItem
  const removeSectionItemData = {
    active: false,
    deactivateReasons: data.deactivateReasons,
    deactivateSource: data.deactivateSource ?? ActivitySource.MANUAL,
    deactivatedAt: new Date(),
  };

  return await db.sectionItem.update({
    where: {
      externalId: data.externalId,
      active: true,
    },
    data: removeSectionItemData,
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
 * Deletes all SectionItems associated with the given ApprovedItem.
 * This mutation is called when an ApprovedItem is deleted from the system
 * (when rejecting a previously approved item).
 *
 * @param db
 * @param approvedItemId number
 */
export async function deleteSectionItemsByApprovedItemId(
  db: PrismaClient,
  approvedItemId: number,
): Promise<void> {
  // TODO: we may want to emit an alaytics event here, as this action destroys
  // corpus-level history on SectionItems
  await db.sectionItem.deleteMany({
    where: {
      approvedItemId,
    },
  });
}
