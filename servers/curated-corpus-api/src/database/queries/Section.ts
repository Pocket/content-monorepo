import { PrismaClient } from '.prisma/client';
import { Section } from '../types';

/**
 * This query retrieves all Sections & their associated SectionItems.
 * Returns an empty array if no Sections are found.
 *
 * @param db
 * @param username
 */
export async function getSectionsWithSectionItems(
  db: PrismaClient,
): Promise<Section[]> {
  const sections = await db.section.findMany({
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
  return sections;
}