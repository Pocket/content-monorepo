import { PrismaClient } from '.prisma/client';
import { Section } from '../types';

/**
 * This query retrieves all active Sections & their associated active SectionItems for a given ScheduledSurface.
 * Returns an empty array if no Sections are found.
 *
 * @param db
 * @param username
 */
export async function getSectionsWithSectionItems(
  db: PrismaClient,
  scheduledSurfaceGuid: string
): Promise<Section[]> {
  const sections = await db.section.findMany({
    where: {
      scheduledSurfaceGuid: scheduledSurfaceGuid,
      active: true
    },
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
  return sections;
}