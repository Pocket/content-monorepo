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
export async function getSectionsWithSectionItems(
  parent,
  args,
  { db }
): Promise<Section[]> {
  return await dbGetSectionsWithSectionItems(db, args.scheduledSurfaceGuid);
}