import { AuthenticationError, NotFoundError } from '@pocket-tools/apollo-utils';

import { createSectionItem as dbCreateSectionItem } from '../../../../database/mutations';
import { SectionItem } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';

/**
 * Adds a curated item to a scheduled surface for a given date.
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
