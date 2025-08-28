import {
  AuthenticationError,
  NotFoundError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import {
  createSection as dbCreateSection,
  updateSection as dbUpdateSection,
  disableEnableSection as dbDisableEnableSection,
  createCustomSection as dbCreateCustomSection,
  deleteCustomSection as dbDeleteCustomSection,
} from '../../../../database/mutations';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import { ActivitySource, IABMetadata } from 'content-common';
import { IAB_CATEGORIES } from '../../iabCategories'

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
  if (data.createSource !== ActivitySource.ML) {
    throw new UserInputError(
      'Cannot create or update a Section: createSource must be ML',
    );
  }

  // Check that the IAB taxonomy & code are valid
  if(data.iab) {
    validateIAB(data.iab)
  }

  // check if the Section with the passed externalId already exists
  const section = await context.db.section.findUnique({
    where: { externalId: data.externalId },
  });

  // if the Section exists, update it
  if (section) {
    return await dbUpdateSection(context.db, data, section.id);
  }

  return await dbCreateSection(context.db, data);

  // TODO: emit creation event to a data pipeline
  // as of this writing (2025-01-09), we are navigating the migration from
  // snowplow & snowflake to glean & bigquery. we are awaiting a decision
  // on the best path forward for our data pipeline.
}


/**
 * Disables or enables a Section.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function disableEnableSection(
  parent,
  { data },
  context: IAdminContext,
): Promise<Section> {
  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // check if the Section with the passed externalId exists
  const section = await context.db.section.findUnique({
    where: { externalId: data.externalId },
  });

  // if Section does not exist, throw NotFoundError
  if (!section) {
    throw new NotFoundError(
      `Cannot disable or enable the section: Section with id "${data.externalId}" does not exist.`,
    );
  }

  // disable or enable a Section
  return await dbDisableEnableSection(context.db, data);

  // TODO: emit creation event to a data pipeline
  // as of this writing (2025-01-09), we are navigating the migration from
  // snowplow & snowflake to glean & bigquery. we are awaiting a decision
  // on the best path forward for our data pipeline.
}

/**
 * Create a Custom Editorial Section.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function createCustomSection(
  parent,
  { data },
  context: IAdminContext,
): Promise<Section> {
  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure createSource == MANUAL for now for this mutation
  if (data.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot create a custom Section: createSource must be MANUAL',
    );
  }

  // Check that the IAB taxonomy & code are valid
  if(data.iab) {
    validateIAB(data.iab)
  }

  return await dbCreateCustomSection(context.db, data);
}

/**
 * Soft-delete a Custom Section.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function deleteCustomSection(
  parent,
  args,
  context: IAdminContext,
): Promise<Section> {
  // check if the Section with the passed externalId exists
  const section = await context.db.section.findUnique({
    where: { externalId: args.externalId },
  });

  // if Section does not exist, throw NotFoundError
  if (!section) {
    throw new NotFoundError(
      `Cannot delete the section: Section with id "${args.externalId}" does not exist.`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(section.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure createSource == MANUAL for now for this mutation
  if (section.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot delete Section: createSource must be MANUAL',
    );
  }

  // Save sectionId to pass to the db mutation
  const sectionId = section.id;

  // soft-delete the custom section
  return await dbDeleteCustomSection(context.db, sectionId, args.externalId);
}


/**
 * Helper function validating IAB taxonomy & code
 *
 * @param iab
 */
export function validateIAB(iab: IABMetadata) {
  // Check that the IAB taxonomy & code are valid
  const { taxonomy, categories } = iab;
  // check that the taxonomy version is supported
  if(!IAB_CATEGORIES[taxonomy]) {
    throw new UserInputError(
      `IAB taxonomy version ${taxonomy} is not supported`
    )
  }
  // make sure there are no "bad" IAB codes present
  const invalidIABCodes = categories.filter((code) => !IAB_CATEGORIES[taxonomy][code]);
  if(invalidIABCodes.length > 0) {
    throw new UserInputError(
      `IAB code(s) invalid: ${invalidIABCodes}`
    )
  }
}
