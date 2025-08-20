import {
  AuthenticationError,
  NotFoundError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import {
  createSection as dbCreateSection,
  updateSection as dbUpdateSection,
  disableEnableSection as dbDisableEnableSection,
  updateCustomSection as dbUpdateCustomSection,
} from '../../../../database/mutations';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import { ActivitySource } from 'content-common';
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
    const { taxonomy, categories } = data.iab;
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
 * Update a Custom Editorial Section.
 */
export async function updateCustomSection(
  parent,
  { data },
  context: IAdminContext,
): Promise<Section> {
  const { externalId } = data;

  // Load current to perform permission + invariants
  const existingSection = await context.db.section.findUnique({
    where: { externalId },
  });

  if (!existingSection) {
    throw new UserInputError(`Section not found for externalId: ${externalId}`);
  }

  // Only allow updating custom/manual sections created via this flow
  if (existingSection.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot update: target Section is not a custom (MANUAL) Section',
    );
  }

  // Check write permissions for both current and new surface (if changing)
  const surfacesToCheck = [existingSection.scheduledSurfaceGuid];
  if (data.scheduledSurfaceGuid && data.scheduledSurfaceGuid !== existingSection.scheduledSurfaceGuid) {
    surfacesToCheck.push(data.scheduledSurfaceGuid);
  }
  
  for (const surfaceGuid of surfacesToCheck) {
    if (!context.authenticatedUser.canWriteToSurface(surfaceGuid)) {
      throw new AuthenticationError(ACCESS_DENIED_ERROR);
    }
  }

  // Check that the IAB taxonomy & code are valid
  if (data.iab) {
    const { taxonomy, categories } = data.iab;
    // check that the taxonomy version is supported
    if (!IAB_CATEGORIES[taxonomy]) {
      throw new UserInputError(
        `IAB taxonomy version ${taxonomy} is not supported`
      );
    }
    // make sure there are no "bad" IAB codes present
    const invalidIABCodes = categories.filter((code) => !IAB_CATEGORIES[taxonomy][code]);
    if (invalidIABCodes.length > 0) {
      throw new UserInputError(
        `IAB code(s) invalid: ${invalidIABCodes}`
      );
    }
  }

  // createSource must be MANUAL for custom sections
  if (data.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot update a custom Section: createSource must be MANUAL',
    );
  }

  // Hand off to DB layer
  return await dbUpdateCustomSection(context.db, data);
}