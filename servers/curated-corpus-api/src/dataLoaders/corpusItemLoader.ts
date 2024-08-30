import DataLoader from 'dataloader';
import { PrismaClient } from '.prisma/client';

import { CorpusItem } from '../database/types';
import {
  getApprovedItemsByExternalIds,
  getApprovedItemsByUrls,
} from '../database/queries/ApprovedItem';

import {
  getCorpusItemFromApprovedItem,
  reorderResultByKey,
} from '../shared/utils';
import { IPublicContext } from '../public/context';

/**
 * dataloader function to retrieve CorpusItems by their ids.
 *
 * @param db PrismaClient
 * @param ids string array of ids
 * @returns array of CorpusItems
 */
export const batchLoadById = async (
  db: PrismaClient,
  ids: string[],
): Promise<CorpusItem[]> => {
  // a CorpusItem is built from an ApprovedItem - so get the underlying
  // ApprovedItems first.
  const approvedItems = await getApprovedItemsByExternalIds(db, ids);

  // convert the ApprovedItems to CorpusItems
  const corpusItems = approvedItems.map((ai) => {
    return getCorpusItemFromApprovedItem(ai);
  });

  // to ensure the results are returned back to the query in the id order they
  // were sent, we need to sort the returned CorpusItems by their id.
  const orderdCorpusItems = reorderResultByKey<CorpusItem, 'id'>(
    { key: 'id', values: ids },
    corpusItems,
  );

  return orderdCorpusItems;
};

/**
 * dataloader batch function to retrieve CorpusItems by their urls.
 *
 * @param db PrismaClient
 * @param urls string array of urls
 * @returns array of CorpusItems
 */
export const batchLoadByUrl = async (
  db: PrismaClient,
  urls: string[],
): Promise<CorpusItem[]> => {
  // a CorpusItem is built from an ApprovedItem - so get the underlying
  // ApprovedItems first.
  const approvedItems = await getApprovedItemsByUrls(db, urls);

  // convert the ApprovedItems to CorpusItems
  const corpusItems = approvedItems.map((ai) => {
    return getCorpusItemFromApprovedItem(ai);
  });

  // to ensure the results are returned back to the query in the url order they
  // were sent, we need to sort the returned ApprovedItems by their url.
  const orderedCorpsuItems = reorderResultByKey<CorpusItem, 'url'>(
    { key: 'url', values: urls },
    corpusItems,
  );

  return orderedCorpsuItems;
};

/**
 * creates two dataloaders for the CorpusItem reference resolver.
 *
 * since a CorpusItem can be referenced by either its id OR its url, we need a
 * dataloader for each.
 *
 * @param context IPublicContext - the public server's context object
 * @returns an object containing both dataloaders
 */
export const createCorpusItemDataLoaders = (
  db: PrismaClient,
): Pick<
  IPublicContext['dataLoaders'],
  'corpusItemsById' | 'corpusItemsByUrl'
> => {
  // create a dataloader for querying CorpusItems by their ids.
  // note: a CorpusItem's id maps to the underlying ApprovedItem's externalId.
  const byIdLoader = new DataLoader(async (ids: string[]) => {
    // retrieve the CorpusItems
    const corpusItems = await batchLoadById(db, ids);

    // for each CorpusItem found by id, populate the dataloader for querying
    // by CorpusItem url. this prevents a db lookup for an item by url when
    // it's already been queried by id.
    corpusItems.forEach((ci) => {
      // the result could be empty from the db (for an invalid id)
      if (ci) {
        byUrlLoader.prime(ci.url, ci);
      }
    });

    return corpusItems;
  });

  // create a dataloader for querying CorpusItems by their urls.
  const byUrlLoader = new DataLoader(async (urls: string[]) => {
    // retrieve the CorpusItems
    const corpusItems = await batchLoadByUrl(db, urls);

    // for each CorpusItem found by url, populate the dataloader for querying
    // by CorpusItem id. this prevents a db lookup for an item by id when it's
    // already been queried by url.
    corpusItems.forEach((ci) => {
      // the result could be empty from the db (for an invalid url)
      if (ci) {
        byIdLoader.prime(ci.id, ci);
      }
    });

    return corpusItems;
  });

  return { corpusItemsById: byIdLoader, corpusItemsByUrl: byUrlLoader };
};
