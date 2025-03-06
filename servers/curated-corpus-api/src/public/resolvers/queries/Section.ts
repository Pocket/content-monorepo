import {
  getSectionsWithSectionItems as dbGetSectionsWithSectionItems
} from '../../../database/queries';
import { Section } from '../../../database/types';

/**
 * Retrieve all active Sections with their active SectionItems for a given ScheduledSurface.
 * Returns an empty array if no Sections found.
 *
 * @param parent
 * @param args
 */
export async function getSections(
  parent,
  args,
  context
): Promise<Section[]> {
  const { filters } = args;
  const sections = await dbGetSectionsWithSectionItems(context.db, filters.scheduledSurfaceGuid);
  // only return sections that are not disabled
  return sections.filter(section => section.disabled === false);
}