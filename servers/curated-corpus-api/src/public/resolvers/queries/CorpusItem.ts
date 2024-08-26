import { CorpusItem } from '../../../database/types';
import {
  getApprovedItemByExternalId,
  getApprovedItemByUrl,
} from '../../../database/queries/ApprovedItem';
import { getCorpusItemFromApprovedItem } from '../../../shared/utils';

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
  { db }
): Promise<CorpusItem> {
  const { url } = item;

  const approvedItem = await getApprovedItemByUrl(db, url);
  if (!approvedItem) {
    return null;
  }

  return getCorpusItemFromApprovedItem(approvedItem);
}

export async function getItemCorpusItem(
  item,
  args,
  { db },
): Promise<CorpusItem> {
  const { givenUrl } = item;

  const approvedItem = await getApprovedItemByUrl(db, givenUrl);
  if (!approvedItem) {
    return null;
  }

  return getCorpusItemFromApprovedItem(approvedItem);
}
