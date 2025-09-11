import {
  getSectionsWithSectionItems as dbGetSectionsWithSectionItems
} from '../../../database/queries';
import { Section, SectionStatus } from '../../../database/types';
import { computeSectionStatus } from '../../../shared/resolvers/fields/SectionStatus';
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
  // Fetch active & non-disabled Sections from DB with active SectionItems
  const sections = await dbGetSectionsWithSectionItems(context.db, true, filters.scheduledSurfaceGuid);

  // Filter only LIVE sections using computeSectionStatus
  const liveSections = sections.filter((section) => computeSectionStatus(section) === SectionStatus.LIVE);

  return liveSections;
}
