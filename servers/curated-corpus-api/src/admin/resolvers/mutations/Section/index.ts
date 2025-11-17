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
  updateCustomSection as dbUpdateCustomSection,
} from '../../../../database/mutations';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import {
  ActivitySource,
  IABMetadata
} from 'content-common';
import { IAB_CATEGORIES } from '../../iabCategories';
import {
  SectionEventType,
  SectionPayload,
} from '../../../../events/types';

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
  const { actionScreen, ...sectionData } = data;

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(sectionData.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure createSource == ML for now for this mutation
  if (sectionData.createSource !== ActivitySource.ML) {
    throw new UserInputError(
      'Cannot create or update a Section: createSource must be ML',
    );
  }

  // Check that the IAB taxonomy & code are valid
  if(sectionData.iab) {
    validateIAB(sectionData.iab)
  }

  // check if the Section with the passed externalId already exists
  const existingSection = await context.db.section.findUnique({
    where: { externalId: sectionData.externalId },
  });

  let section: Section;
  let eventType: SectionEventType;

  // if the Section exists, update it
  if (existingSection) {
    section = await dbUpdateSection(context.db, sectionData, existingSection.id);
    eventType = SectionEventType.UPDATE_SECTION;
  } else {
    section = await dbCreateSection(context.db, sectionData);
    eventType = SectionEventType.CREATE_SECTION;
  }

  const sectionForEvents: SectionPayload = {
    section: {
      ...section,
      action_screen: actionScreen,
    },
  };

  context.emitSectionEvent(eventType, sectionForEvents);

  return section;
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
  const updatedSection = await dbDisableEnableSection(context.db, data);

  const sectionForEvents: SectionPayload = {
    section: updatedSection,
  };

  context.emitSectionEvent(SectionEventType.UPDATE_SECTION, sectionForEvents);

  return updatedSection;
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
  const { actionScreen, ...sectionData } = data;

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(sectionData.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure createSource == MANUAL for now for this mutation
  if (sectionData.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot create a custom Section: createSource must be MANUAL',
    );
  }

  // Check that the IAB taxonomy & code are valid
  if(sectionData.iab) {
    validateIAB(sectionData.iab)
  }

  const section = await dbCreateCustomSection(context.db, sectionData);

  const sectionForEvents: SectionPayload = {
    section: {
      ...section,
      action_screen: actionScreen,
    },
  };

  context.emitSectionEvent(SectionEventType.CREATE_SECTION, sectionForEvents);

  return section;
}

/**
 * Updates an existing custom editorial section.
 *
 * This mutation allows curators to modify sections created with MANUAL source.
 * It performs comprehensive validation including:
 * - Existence check for the section
 * - Source type validation (must be MANUAL)
 * - Permission validation for both current and target surfaces
 * - IAB metadata validation if provided
 *
 * @param parent - GraphQL parent resolver
 * @param data - UpdateCustomSectionInput containing section updates
 * @param context - Admin context with auth and database access
 * @returns Updated Section with associated SectionItems
 * @throws UserInputError - If section not found, invalid source, or validation fails
 * @throws AuthenticationError - If user lacks required permissions
 */
export async function updateCustomSection(
  parent,
  { data },
  context: IAdminContext,

): Promise<Section> {
  const { externalId, actionScreen, ...updateData } = data;

  // Find the existing section
  const existingSection = await context.db.section.findUnique({
    where: { externalId },
  });

  if (!existingSection) {
    throw new NotFoundError(`Cannot update section: Section with id "${externalId}" does not exist.`);
  }

  // Check if the existing section is not a custom section
  if (existingSection.createSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      `Section with externalId ${externalId} is not a custom (MANUAL) Section and cannot be updated using this mutation`,
    );
  }

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(existingSection.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Make sure updateSource == MANUAL for now for this mutation
  if (updateData.updateSource !== ActivitySource.MANUAL) {
    throw new UserInputError(
      'Cannot update a Section: updateSource must be MANUAL',
    );
  }

  // Check that the IAB taxonomy & code are valid
  if (updateData.iab) {
    validateIAB(updateData.iab);
  }

  const section = await dbUpdateCustomSection(context.db, { externalId, ...updateData });

  const sectionForEvents: SectionPayload = {
    section: {
      ...section,
      action_screen: actionScreen,
    },
  };

  context.emitSectionEvent(SectionEventType.UPDATE_SECTION, sectionForEvents);

  return section;
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
  const { externalId, actionScreen } = args;

  // check if the Section with the passed externalId exists
  const section = await context.db.section.findUnique({
    where: { externalId },
  });

  // if Section does not exist, throw NotFoundError
  if (!section) {
    throw new NotFoundError(
      `Cannot delete the section: Section with id "${externalId}" does not exist.`,
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
  const deletedSection = await dbDeleteCustomSection(context.db, sectionId, externalId);

  const sectionForEvents: SectionPayload = {
    section: {
      ...deletedSection,
      action_screen: actionScreen,
    },
  };

  context.emitSectionEvent(SectionEventType.DELETE_SECTION, sectionForEvents);

  return deletedSection;
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
