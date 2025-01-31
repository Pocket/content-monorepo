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
  { db }
): Promise<Section[]> {
  const { filters } = args;
  return await dbGetSectionsWithSectionItems(db, filters.scheduledSurfaceGuid);
}