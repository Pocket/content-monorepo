import { AuthenticationError, UserInputError } from '@pocket-tools/apollo-utils';

import {
  createSection as dbCreateSection,
  updateSection as dbUpdateSection,
} from '../../../../database/mutations';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import { ActivitySource } from 'content-common';

/**
 * Create or update a Section.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function createOrUpdateSection(
  parent,
  { data },
  context: IAdminContext,
): Promise<Section> {
  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure createSource == ML for now for this mutation
  if(data.createSource !== ActivitySource.ML) {
    throw new UserInputError(
      "Cannot create a Section: createSource must be ML"
    );
  }

  // check if the Section with the passed externalId already exists
  const section = await context.db.section.findUnique({
    where: { externalId: data.externalId },
  });

  // if the Section exists, update it
  if (section) {
    return await dbUpdateSection(context.db, data);
  }

  return await dbCreateSection(context.db, data);

  // TODO: emit creation event to a data pipeline
  // as of this writing (2025-01-09), we are navigating the migration from
  // snowplow & snowflake to glean & bigquery. we are awaiting a decision
  // on the best path forward for our data pipeline.
}