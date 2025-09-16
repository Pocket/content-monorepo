import {
  getSectionsWithSectionItems as dbGetSectionsWithSectionItems
} from '../../../database/queries';
import { Section } from '../../../database/types';
import { IPublicContext } from '../../context';

/**
 * Retrieve all active & enabled & LIVE Sections with their active SectionItems for a given ScheduledSurface.
 * Returns an empty array if no Sections found.
 *
 * @param parent
 * @param args
 */
export async function getSections(
  parent,
  args,
  context: IPublicContext,
): Promise<Section[]> {
  const { filters } = args;
  // Fetch active & non-disabled + LIVE Sections from DB with active SectionItems
  return await dbGetSectionsWithSectionItems(context.db, true, filters.scheduledSurfaceGuid);
}
