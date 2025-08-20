import { PrismaClient, Prisma } from '.prisma/client';
import { CreateSectionInput, DisableEnableSectionInput, Section, UpdateCustomSectionInput } from '../types';
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

  const sectionItemUpdateData: Prisma.SectionItemUpdateManyMutationInput = {
    active: false,
    deactivateSource: ActivitySource.ML,
    deactivatedAt: new Date(),
  };

  // if a Section has any active SectionItems associted with it, mark those as in-active.
  await db.sectionItem.updateMany({
    where: {
      sectionId: sectionId,
      active: true,
    },
    data: sectionItemUpdateData,
  });

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
  
  return {
    ...updatedSection,
    sectionItems: []
  }
}
/**
 * Updates an existing Custom (Editorial) Section's editable fields.
 * Assumes existence & auth are enforced in the resolver layer.
 */
export async function updateCustomSection(
  db: PrismaClient,
  data: UpdateCustomSectionInput,
): Promise<Section> {
  const {
    externalId,
    title,
    description,
    heroTitle,
    heroDescription,
    startDate,
    endDate,
    scheduledSurfaceGuid,
    iab,
    sort,
    active,
    disabled,
  } = data;

  const updateData: any = {
    ...(typeof title !== 'undefined' && { title }),
    ...(typeof description !== 'undefined' && { description }),
    ...(typeof heroTitle !== 'undefined' && { heroTitle }),
    ...(typeof heroDescription !== 'undefined' && { heroDescription }),
    ...(typeof scheduledSurfaceGuid !== 'undefined' && { scheduledSurfaceGuid }),
    ...(typeof iab !== 'undefined' && { iab }),
    ...(typeof sort !== 'undefined' && { sort }),
    ...(typeof active !== 'undefined' && { active }),
    ...(typeof disabled !== 'undefined' && { disabled }),
    ...(typeof startDate !== 'undefined' && { startDate: new Date(startDate) }),
    ...(typeof endDate !== 'undefined' && {
      endDate: endDate ? new Date(endDate) : null, // allow clearing by sending null/empty
    }),
  };

  const updated = await db.section.update({
    where: { externalId },
    data: updateData,
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

  return updated;
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
