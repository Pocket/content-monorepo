import { PrismaClient } from '.prisma/client';
import { Section } from '../types';

/**
 * This query retrieves a Section by externalId & its associated SectionItems.
 * Returns null if externalId is not found in the database.
 *
 * @param db
 * @param externalId
 * @param username
 */
export async function getSectionWithSectionItems(
  db: PrismaClient,
  externalId: string,
): Promise<Section | null> {
  return await db.section.findUnique({
    where: {externalId},
    include: {
      sectionItems: {
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