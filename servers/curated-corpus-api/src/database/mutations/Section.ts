import { PrismaClient } from '.prisma/client';
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
  const { externalId, title, scheduledSurfaceGuid, sort, createSource, active } = data;

  const createData = {
    externalId,
    title,
    scheduledSurfaceGuid,
    sort,
    createSource,
    active
  };

  return await db.section.create({
    data: createData
  });
}

/**
 * This mutation updates an existing Section & sets any associated SectionItems in-active.
 *
 * @param db
 * @param data
 * @param username
 */
export async  function updateSection (
  db: PrismaClient,
  data: CreateSectionInput
): Promise<Section> {
  const { externalId, title, scheduledSurfaceGuid, sort, active } = data;

  // Get the id of the Section to update using the externalId
  // this is for updating any associated SectionItems
  const section = await db.section.findUnique({
    where: {externalId: externalId}
  })

  const updateData = {
    title,
    scheduledSurfaceGuid,
    sort,
    active
  };

  // if Section is marked as in-active, set the deactivateSource
  if(!active) {
    updateData['deactivateSource'] = ActivitySource.ML;
  }


  // if a Section has any active SectionItems associted with it, mark those as in-active.
  await db.sectionItem.updateMany({
    where: {
      sectionId: section.id,
      active: true
    },
    data: {
      active: false,
      deactivateSource: ActivitySource.ML
    },
  });

  // Update the existing Section
  return await db.section.update({
    where: { externalId: section.externalId },
    data: updateData
  })
}