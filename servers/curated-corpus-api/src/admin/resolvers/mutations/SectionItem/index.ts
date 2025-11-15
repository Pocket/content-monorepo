import { AuthenticationError, NotFoundError } from '@pocket-tools/apollo-utils';

import {
  createSectionItem as dbCreateSectionItem,
  removeSectionItem as dbRemoveSectionItem,
} from '../../../../database/mutations';
import { SectionItem } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import { ActivitySource, ML_USERNAME } from 'content-common';
import {
  SectionItemEventType,
  SectionItemPayload,
} from '../../../../events/types';

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
  const { actionScreen, ...createData } = data;

  // find the targeted Section so we can verify user has write access to its Scheduled Surface
  const section = await context.db.section.findUnique({
    where: { externalId: createData.sectionExternalId },
  });

  if (!section) {
    throw new NotFoundError(
      `Cannot create a section item: Section with id "${createData.sectionExternalId}" does not exist.`,
    );
  }

  const scheduledSurfaceGuid = section.scheduledSurfaceGuid;

  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Determine the source based on the authenticated user
  // Items created by ML have username === ML_USERNAME, all other users are MANUAL
  const createSource =
    context.authenticatedUser.username === ML_USERNAME
      ? ActivitySource.ML
      : ActivitySource.MANUAL;

  const sectionItem = await dbCreateSectionItem(
    context.db,
    {
      approvedItemExternalId: createData.approvedItemExternalId,
      rank: createData.rank,
      sectionId: section.id,
    },
    createSource,
  );

  const sectionItemForEvents: SectionItemPayload = {
    sectionItem: {
      ...sectionItem,
      action_screen: actionScreen,
    },
  };

  context.emitSectionItemEvent(
    SectionItemEventType.ADD_SECTION_ITEM,
    sectionItemForEvents,
  );

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
  { data },
  context: IAdminContext,
): Promise<SectionItem> {
  const { actionScreen, ...removeData } = data;

  // First check if the SectionItem exists & check if it is active
  const sectionItemToRemove = await context.db.sectionItem.findUnique({
    where: { externalId: removeData.externalId, active: true },
  });

  if (sectionItemToRemove) {
    // Check if the user can perform this mutation
    if (!context.authenticatedUser.canWriteToCorpus()) {
      throw new AuthenticationError(ACCESS_DENIED_ERROR);
    }

    const sectionItem = await dbRemoveSectionItem(context.db, {
      externalId: removeData.externalId,
      deactivateReasons: removeData.deactivateReasons,
      deactivateSource: removeData.deactivateSource,
    });

    const sectionItemForEvents: SectionItemPayload = {
      sectionItem: {
        ...sectionItem,
        action_screen: actionScreen,
      },
    };

    context.emitSectionItemEvent(
      SectionItemEventType.REMOVE_SECTION_ITEM,
      sectionItemForEvents,
    );

    return sectionItem;
  }
  // Check if SectionItem exists
  else {
    throw new NotFoundError(
      `Cannot remove a section item: Section item with id "${removeData.externalId}" does not exist.`,
    );
  }
}
