import { PrismaClient, Prisma } from '.prisma/client';
import { CreateSectionInput, Section } from '../types';
import { ActivitySource } from 'content-common';

/**
 * This mutation creates a new Section.
 *
 * @param db
 * @param data
 * @param username
 */
export async function createSection(
  db: PrismaClient,
  data: CreateSectionInput,
): Promise<Section> {
  const {
    externalId,
    title,
    scheduledSurfaceGuid,
    sort,
    createSource,
    active,
  } = data;

  const createData = {
    externalId,
    title,
    scheduledSurfaceGuid,
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
 * @returns
 */
export async function updateSection(
  db: PrismaClient,
  data: CreateSectionInput,
  sectionId: number,
): Promise<Section> {
  const { externalId, title, scheduledSurfaceGuid, sort, active } = data;

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
