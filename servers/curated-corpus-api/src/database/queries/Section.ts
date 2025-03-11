import { PrismaClient } from '.prisma/client';
import { Section } from '../types';

/**
 * This query retrieves all active Sections & their associated active SectionItems for a given ScheduledSurface.
 * If the context is public, only active & enabled Sections are retrieved.
 * If the context is admin, all active & enabled/disabled Sections are retrieved.
 * Returns an empty array if no Sections are found.
 *
 * @param db
 * @param isPublicContext
 * @param scheduledSurfaceGuid
 */
export async function getSectionsWithSectionItems(
  db: PrismaClient,
  isPublicContext: boolean,
  scheduledSurfaceGuid: string
): Promise<Section[]> {
  const sections = await db.section.findMany({
    where: {
      scheduledSurfaceGuid: scheduledSurfaceGuid,
      active: true,
      // if public query, filter by disabled
      ...(isPublicContext ? { disabled: false } : {}),
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