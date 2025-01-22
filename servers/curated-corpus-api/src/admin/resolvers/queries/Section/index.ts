import { AuthenticationError } from '@pocket-tools/apollo-utils';

import {
  getSectionsWithSectionItems as dbGetSectionsWithSectionItems
} from '../../../../database/queries';
import { Section } from '../../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { IAdminContext } from '../../../context';

/**
 * Retrieve all Sections with their SectionItems. Returns empty array if no Sections found.
 *
 * @param parent
 * @param context
 */
export async function getSectionsWithSectionItems(
  parent,
  args,
  context: IAdminContext,
): Promise<Section[]> {
  // Check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }
  return await dbGetSectionsWithSectionItems(context.db);
}