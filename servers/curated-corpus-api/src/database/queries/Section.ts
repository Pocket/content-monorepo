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
 * @param createSource - optional filter to query by createSource (ML or MANUAL)
 */
export async function getSectionsWithSectionItems(
  db: PrismaClient,
  isPublicContext: boolean,
  scheduledSurfaceGuid: string,
  createSource?: 'ML' | 'MANUAL'
): Promise<Section[]> {
  const sections = await db.section.findMany({
    where: {
      scheduledSurfaceGuid: scheduledSurfaceGuid,
      active: true,
      // if public query, filter by disabled
      ...(isPublicContext ? { disabled: false } : {}),
      // if createSource is provided, filter by it
      ...(createSource ? { createSource } : {}),
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