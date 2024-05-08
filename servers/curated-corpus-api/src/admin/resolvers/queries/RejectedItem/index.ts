import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import { RejectedCuratedCorpusItem } from '.prisma/client';
import config from '../../../../config';
import {
  getRejectedItemByUrl as dbGetRejectedItemByUrl,
  getRejectedCuratedCorpusItems as dbGetRejectedCuratedCorpusItems,
} from '../../../../database/queries';
import { IAdminContext } from '../../../context';
import { AuthenticationError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';

/**
 * This query retrieves rejected curated items from the database.
 *
 * @param parent
 * @param args
 * @param context
 */
export async function getRejectedItems(
  parent,
  args,
  context: IAdminContext,
): Promise<Connection<RejectedCuratedCorpusItem>> {
  //check if the user has the required permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  let { pagination } = args;

  // Set the defaults for pagination if nothing's been provided
  if (
    !pagination ||
    (pagination.first === undefined && pagination.last === undefined)
  ) {
    pagination = {
      first: config.app.pagination.rejectedItemsPerPage,
    };
  } else {
    // Add some limits to how many items can be retrieved at any one time.
    // These limits are higher than the defaults applied above.
    const maxAllowedResults = config.app.pagination.maxAllowedResults;
    if (pagination.first && pagination.first > maxAllowedResults) {
      pagination.first = maxAllowedResults;
    }
    if (pagination.last && pagination.last > maxAllowedResults) {
      pagination.last = maxAllowedResults;
    }
  }

  return await dbGetRejectedCuratedCorpusItems(
    context.db,
    pagination,
    args.filters,
  );
}

/**
 * This query returns a rejected item with a given URL if it finds one
 * in the Curated Corpus (among rejected items only), or
 * return null if the url is not found
 *
 * @param parent
 * @param args
 * @param context
 */
export async function getRejectedItemByUrl(
  parent,
  args,
  context: IAdminContext,
): Promise<RejectedCuratedCorpusItem | null> {
  //check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  return await dbGetRejectedItemByUrl(context.db, args.url);
}
