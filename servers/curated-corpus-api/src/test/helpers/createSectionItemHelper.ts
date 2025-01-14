import { PrismaClient, SectionItem } from '.prisma/client';

export interface CreateSectionItemHelperInput {
  approvedItemId: number,
  sectionId: number,
  rank?: number
}

/**
 * A helper function that creates a sample section item for testing or local development.
 * @param prisma
 * @param data
 */
export async function createSectionItemHelper(
  prisma: PrismaClient,
  data: CreateSectionItemHelperInput,
): Promise<SectionItem> {

  return await prisma.sectionItem.create({
    data: data,
  });
}