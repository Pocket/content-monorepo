import { Section } from '../types';
import { PublicContextManager } from '../../public/context';

/**
 * This query retrieves all active Sections & their associated active SectionItems for a given ScheduledSurface.
 * If the context is public, only active & enabled Sections are retrieved.
 * If the context is public, all active & enabled/disabled Sections are retrieved.
 * Returns an empty array if no Sections are found.
 *
 * @param db
 * @param username
 */
export async function getSectionsWithSectionItems(
  context,
  scheduledSurfaceGuid: string
): Promise<Section[]> {
  // check if public context
  const isPublicContext = context instanceof PublicContextManager;

  const sections = await context.db.section.findMany({
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