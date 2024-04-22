import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import config from '../../../../config';
import {
  getApprovedItems as dbGetApprovedItems,
  getApprovedItemByUrl as dbGetApprovedItemByUrl,
  getApprovedItemByExternalId as dbGetApprovedItemByExternalId,
  getScheduledSurfaceHistory as dbGetScheduledSurfaceHistory,
} from '../../../../database/queries';
import {
  ACCESS_DENIED_ERROR,
  ScheduledSurfaces,
} from '../../../../shared/types';
import { IAdminContext } from '../../../context';
import {
  ApprovedItem,
  ApprovedItemScheduledSurfaceHistory,
} from '../../../../database/types';

/**
 * This query retrieves approved items from the database.
 *
 * @param parent
 * @param args
 * @param context
 */
export async function getApprovedItems(
  parent,
  args,
  context: IAdminContext,
): Promise<Connection<ApprovedItem>> {
  //check if the user does not have the permissions to access this query
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
    pagination = { first: config.app.pagination.approvedItemsPerPage };
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

  return await dbGetApprovedItems(context.db, pagination, args.filters);
}

/**
 * This query returns an approved item with a given URL if it finds one
 * in the Curated Corpus (among approved items only), or
 * return null if the url is not found
 *
 * @param parent
 * @param args
 * @param context
 */
export async function getApprovedItemByUrl(
  parent,
  args,
  context: IAdminContext,
): Promise<ApprovedItem | null> {
  //check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  return await dbGetApprovedItemByUrl(context.db, args.url);
}

/**
 * This query returns an approved item with a given external ID if it finds one
 * in the Curated Corpus (among approved items only), or return null
 * if the external ID is not found
 *
 * @param parent
 * @param args
 * @param context
 */
export async function getApprovedItemByExternalId(
  parent,
  args,
  context: IAdminContext,
): Promise<ApprovedItem | null> {
  //check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  return await dbGetApprovedItemByExternalId(context.db, args.externalId);
}

/**
 * Retrieves a history of when and on what scheduled surface a corpus item
 * was scheduled.
 */
export async function getScheduledSurfaceHistory(
  parent,
  args,
  { db },
): Promise<ApprovedItemScheduledSurfaceHistory[]> {
  // Get the external ID of the Approved Item itself
  const { externalId } = parent;

  // Get the optional filters. Not specifying any means we will retrieve
  // the entire list of all the occasions this approved item was scheduled
  // on all surfaces, in descending order (most recently scheduled first).
  //
  // Limiting it to a single surface means we'll only retrieve data for
  // one scheduled surface (useful for when you only need the one to filter out
  // prospects on the Prospecting page).
  //
  // Limiting the number of results to one means only the most recent result
  // will be returned.
  const { filters } = args;
  let limit: number = config.app.pagination.scheduledSurfaceHistory;
  let scheduledSurfaceGuid: string | undefined;

  // Filters on this subquery are completely optional, which necessitates
  // the below shenanigans to work out the values if the filters _are_ present.
  if (filters) {
    limit = 'limit' in filters ? filters.limit : limit;

    scheduledSurfaceGuid =
      'scheduledSurfaceGuid' in filters
        ? filters.scheduledSurfaceGuid
        : undefined;
  }

  // If supplied, check if the scheduled surface is valid
  if (scheduledSurfaceGuid) {
    const surface = ScheduledSurfaces.find((surface) => {
      return surface.guid === scheduledSurfaceGuid;
    });

    if (!surface) {
      throw new UserInputError(
        `Could not find Scheduled Surface with id of "${scheduledSurfaceGuid}".`,
      );
    }
  }

  // call the db function that returns scheduled items
  return dbGetScheduledSurfaceHistory(
    db,
    externalId,
    scheduledSurfaceGuid,
    limit,
  );
}
