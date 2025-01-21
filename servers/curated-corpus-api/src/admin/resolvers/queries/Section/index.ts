import { AuthenticationError } from '@pocket-tools/apollo-utils';

import {
  getSectionWithSectionItems as dbGetSectionWithSectionItems
} from '../../../../database/queries';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';

/**
 * Retrieve a Section with its SectionItems. Returns null if the Section
 * externalId is not found.
 *
 * @param parent
 * @param externalId
 * @param context
 */
export async function getSectionWithSectionItems(
  parent,
  args,
  context: IAdminContext,
): Promise<Section | null> {
  // Check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }
  return await dbGetSectionWithSectionItems(context.db, args.externalId);
}