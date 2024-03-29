import { CorpusItem } from '../../../database/types';
import {
  getApprovedItemByExternalId,
  getApprovedItemByUrl,
} from '../../../database/queries/ApprovedItem';
import { getCorpusItems } from '../../../database/queries/CorpusItem';

import { getCorpusItemFromApprovedItem } from '../../../shared/utils';
import { IPublicContext } from '../../context';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import config from '../../../config';
/**
 * Pulls in approved corpus items for a given id or url.
 *
 * @param item { id, url }
 * @param db
 */
export async function getCorpusItem({ id, url }, { db }): Promise<CorpusItem> {
  const approvedItem = id
    ? await getApprovedItemByExternalId(db, id)
    : await getApprovedItemByUrl(db, url);

  if (!approvedItem) {
    return null;
  }

  return getCorpusItemFromApprovedItem(approvedItem);
}

export async function getSavedCorpusItem(
  item,
  args,
  { db },
): Promise<CorpusItem> {
  const { url } = item;

  const approvedItem = await getApprovedItemByUrl(db, url);
  if (!approvedItem) {
    return null;
  }

  return getCorpusItemFromApprovedItem(approvedItem);
}

/**
 * This query retrieves curated items from the database.
 *
 * @param parent
 * @param args
 * @param context
 */
export async function corpusItems(
  parent,
  args,
  context: IPublicContext,
): Promise<Connection<CorpusItem>> {
  let { pagination } = args;

  // Set the defaults for pagination if nothing's been provided
  if (
    !pagination ||
    (pagination.first === undefined && pagination.last === undefined)
  ) {
    pagination = { first: config.app.pagination.curatedItemsPerPage };
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

  return await getCorpusItems(context.db, pagination, args.filters);
}
