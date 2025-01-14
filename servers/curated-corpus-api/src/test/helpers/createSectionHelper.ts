import { Prisma, PrismaClient, Section } from '.prisma/client';
import { faker } from '@faker-js/faker';

import { ScheduledSurfacesEnum, ScheduledItemSource } from 'content-common';

// optional information you can provide when creating an section
export interface CreateSectionHelperOptionalInput {
  createSource?: ScheduledItemSource;
  // externalId can be provided, but if not will be generated by prisma on insert
  externalId?: string;
  scheduledSurfaceGuid?: ScheduledSurfacesEnum;
  title?: string;
}

// create an array of scheduled surface guids for random selection
const scheduledSurfaceGuids = Object.values(ScheduledSurfacesEnum).map(
  (value) => value,
);

/**
 * A helper function that creates a sample section for testing or local development.
 * @param prisma
 * @param data
 */
export async function createSectionHelper(
  prisma: PrismaClient,
  data: CreateSectionHelperOptionalInput,
): Promise<Section> {
  const createSectionDefaults = {
    createSource: faker.helpers.arrayElement([
      ScheduledItemSource.MANUAL,
      ScheduledItemSource.ML,
    ]),
    scheduledSurfaceGuid: faker.helpers.arrayElement(scheduledSurfaceGuids),
    title: faker.lorem.sentence(10),
  };

  const inputs: Prisma.SectionCreateInput = {
    ...createSectionDefaults,
    ...data,
  };

  return await prisma.section.create({
    data: inputs,
  });
}
