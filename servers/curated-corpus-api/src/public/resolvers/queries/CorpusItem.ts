import { CorpusItem } from '../../../database/types';
import { getApprovedItemByUrl } from '../../../database/queries/ApprovedItem';
import { getCorpusItemFromApprovedItem } from '../../../shared/utils';

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

export async function getItemCorpusItem(
  item,
  args,
  { db },
): Promise<CorpusItem> {
  const { givenUrl, resolvedUrl } = item;

  const approvedItem =
    (await getApprovedItemByUrl(db, givenUrl)) ??
    // If a record is not found for a givenUrl, it could be that
    // the URL changed -- try the resolvedUrl
    (await getApprovedItemByUrl(db, resolvedUrl));
  if (!approvedItem) {
    return null;
  }
  return getCorpusItemFromApprovedItem(approvedItem);
}
