import { AuthenticationError, NotFoundError } from '@pocket-tools/apollo-utils';

import { createSectionItem as dbCreateSectionItem, 
         removeSectionItem as dbRemoveSectionItem, } from '../../../../database/mutations';
import { SectionItem } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';

/**
 * Creates a SectionItem & adds it to a Section.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function createSectionItem(
  parent,
  { data },
  context: IAdminContext,
): Promise<SectionItem> {
  // find the targeted Section so we can verify user has write access to its Scheduled Surface
  const section = await context.db.section.findUnique({
    where: { externalId: data.sectionExternalId },
  });

  if (!section) {
    throw new NotFoundError(
      `Cannot create a section item: Section with id "${data.sectionExternalId}" does not exist.`,
    );
  }

  const scheduledSurfaceGuid = section.scheduledSurfaceGuid;

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  const sectionItem = await dbCreateSectionItem(context.db, {
    approvedItemExternalId: data.approvedItemExternalId,
    rank: data.rank,
    sectionId: section.id,
  });

  // TODO: emit creation event to a data pipeline
  // as of this writing (2025-01-09), we are navigating the migration from
  // snowplow & snowflake to glean & bigquery. we are awaiting a decision
  // on the best path forward for our data pipeline.

  return sectionItem;
}

/**
 * Removes an active SectionItem from a Section.
 *
 * @param parent
 * @param args
 * @param context
 */
export async function removeSectionItem(
  parent,
  args,
  context: IAdminContext,
): Promise<SectionItem> {
  // First check if the SectionItem exists
  const sectionItemToRemove =  await context.db.sectionItem.findUnique({
    where: { externalId: args.externalId}
  });

  if(sectionItemToRemove) {
    // Check if the user can perform this mutation
    if (!context.authenticatedUser.canWriteToCorpus()) {
      throw new AuthenticationError(ACCESS_DENIED_ERROR);
    }
    
    return await dbRemoveSectionItem(context.db, args.externalId);
  }
  // Check if SectionItem exists
  else {
    throw new NotFoundError(`Cannot remove a section item: Section item with id "${args.externalId}" does not exist.`)
  }
}
