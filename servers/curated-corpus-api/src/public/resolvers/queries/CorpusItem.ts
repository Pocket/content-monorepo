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
  const { givenUrl } = item;

  const approvedItem = await getApprovedItemByUrl(db, givenUrl);
  if (!approvedItem) {
    return null;
  }

  return getCorpusItemFromApprovedItem(approvedItem);
}
