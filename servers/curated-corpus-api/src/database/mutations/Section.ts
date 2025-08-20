import { PrismaClient, Prisma } from '.prisma/client';
import { CreateCustomSectionInput, CreateSectionInput, DisableEnableSectionInput, UpdateCustomSectionInput, Section } from '../types';
import { ActivitySource } from 'content-common';

/**
 * This mutation creates a new Section.
 *
 * @param db
 * @param data
 * @param username
 * @returns Section
 */
export async function createSection(
  db: PrismaClient,
  data: CreateSectionInput,
): Promise<Section> {
  const {
    externalId,
    title,
    scheduledSurfaceGuid,
    iab,
    sort,
    createSource,
    active,
  } = data;

  const createData = {
    externalId,
    title,
    scheduledSurfaceGuid,
    iab,
    sort,
    createSource,
    active,
  };

  const newSection = await db.section.create({
    data: createData,
  });

  return {
    ...newSection,
    sectionItems: []
  }
}

/**
 * This mutation updates an existing Section & sets any associated SectionItems in-active.
 *
 * @param db
 * @param data
 * @param sectionId
 * @returns Section
 */
export async function updateSection(
  db: PrismaClient,
  data: CreateSectionInput,
  sectionId: number,
): Promise<Section> {
  const { externalId, title, scheduledSurfaceGuid, iab, sort, active } = data;

  const sectionUpdateData: Prisma.SectionUpdateInput = {
    title,
    scheduledSurfaceGuid,
    iab,
    sort,
    active,
  };

  // if Section is marked as in-active, set the deactivateSource and time
  if (!active) {
    sectionUpdateData.deactivateSource = ActivitySource.ML;
    sectionUpdateData.deactivatedAt = new Date();
  }

  // Update the existing Section
  const updatedSection = await db.section.update({
    where: { externalId: externalId },
    data: sectionUpdateData,
  });

  // Fetch active SectionItems
  const activeSectionItems = await db.sectionItem.findMany({
    where: {
      sectionId,
      active: true,
    },
    include: {
      approvedItem: {
        include: {
          authors: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      }
    },
  });
  
  return {
    ...updatedSection,
    sectionItems: activeSectionItems
  }
}

/**
 * This mutation disables or enables a Section.
 *
 * @param db
 * @param data
 * @returns Section
 */
export async function disableEnableSection(
  db: PrismaClient,
  data: DisableEnableSectionInput
): Promise<Section> {
  const { externalId, disabled } = data;

  const updatedSectionData: Prisma.SectionUpdateInput = {
    disabled,
  };

  return await db.section.update({
    where: { externalId: externalId },
    data: updatedSectionData,
    include: {
      sectionItems: {
        where: {
          active: true
        },
        include: {
          approvedItem: {
            include: {
              authors: {
                orderBy: [{ sortOrder: 'asc' }],
              },
            },
          }
        }
      }
    }
  });
}

/**
 * This mutation creates a new Custom Editorial Section.
 *
 * @param db
 * @param data
 * @param username
 * @returns Section
 */
export async function createCustomSection(
  db: PrismaClient,
  data: CreateCustomSectionInput,
): Promise<Section> {
  const {
    title,
    description,
    heroTitle,
    heroDescription,
    startDate,
    endDate,
    scheduledSurfaceGuid,
    iab,
    sort,
    createSource,
    active,
  } = data;

  const createData = {
    title,
    description,
    heroTitle,
    heroDescription,
    startDate: new Date(startDate),
    endDate: data.endDate ? new Date(endDate) : undefined,
    scheduledSurfaceGuid,
    iab,
    sort,
    createSource,
    active,
  };

  const newSection = await db.section.create({
    data: createData,
  });

  return {
    ...newSection,
    sectionItems: []
  }
}

/**
 * Updates an existing Custom Editorial Section in the database.
 * 
 * Performs a partial update, only modifying fields that are provided.
 * Handles special cases like:
 * - Setting deactivation fields when marking inactive
 * - Converting date strings to Date objects
 * - Clearing fields when null is provided
 * 
 * @param db - Prisma client instance
 * @param data - UpdateCustomSectionInput with fields to update
 * @returns Updated Section with associated active SectionItems
 */
export async function updateCustomSection(
  db: PrismaClient,
  data: UpdateCustomSectionInput,
): Promise<Section> {
  const { externalId, ...updateFields } = data;

  const updateData: Prisma.SectionUpdateInput = {};

  // Only include fields that are provided
  if (updateFields.title !== undefined) updateData.title = updateFields.title;
  if (updateFields.description !== undefined) updateData.description = updateFields.description;
  if (updateFields.heroTitle !== undefined) updateData.heroTitle = updateFields.heroTitle;
  if (updateFields.heroDescription !== undefined) updateData.heroDescription = updateFields.heroDescription;
  if (updateFields.startDate !== undefined) updateData.startDate = new Date(updateFields.startDate);
  if (updateFields.endDate !== undefined) updateData.endDate = updateFields.endDate ? new Date(updateFields.endDate) : null;
  if (updateFields.scheduledSurfaceGuid !== undefined) updateData.scheduledSurfaceGuid = updateFields.scheduledSurfaceGuid;
  if (updateFields.iab !== undefined) updateData.iab = updateFields.iab;
  if (updateFields.sort !== undefined) updateData.sort = updateFields.sort;
  if (updateFields.active !== undefined) updateData.active = updateFields.active;
  if (updateFields.disabled !== undefined) updateData.disabled = updateFields.disabled;

  // If Section is marked as inactive, set the deactivateSource and time
  if (updateFields.active === false) {
    updateData.deactivateSource = ActivitySource.MANUAL;
    updateData.deactivatedAt = new Date();
  }

  const updated = await db.section.update({
    where: { externalId },
    data: updateData,
    include: {
      sectionItems: {
        where: { active: true },
        include: {
          approvedItem: {
            include: {
              authors: {
                orderBy: [{ sortOrder: 'asc' }],
              },
            },
          },
        },
      },
    },
  });

  return updated;
}
