import { ForbiddenError } from '@pocket-tools/apollo-utils';
import { getCurationCategories as dbGetCurationCategories } from '../../../database/queries';
import { CurationCategory } from '.prisma/client';
import { ACCESS_DENIED_ERROR } from '../../../shared/constants';

/**
 * @param parent
 * @param _
 * @param db
 * @param authenticatedUser
 */
export async function getCurationCategories(
  parent,
  _,
  { db, authenticatedUser },
): Promise<CurationCategory[]> {
  if (!authenticatedUser.canRead) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  return await dbGetCurationCategories(db);
}
