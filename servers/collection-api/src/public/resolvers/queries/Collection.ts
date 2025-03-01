import { NotFoundError, UserInputError } from '@pocket-tools/apollo-utils';
import { CollectionComplete } from '../../../database/types';
import {
  countPublishedCollections,
  getCollectionBySlug as dbGetCollectionBySlug,
  getPublishedCollections,
} from '../../../database/queries';
import config from '../../../config';
import { CollectionsResult } from '../../../typeDefs';
import { getPagination } from '../../../utils';

/**
 * @param parent
 * @param slug
 * @param db
 */
export async function getCollectionBySlug(
  parent,
  { slug },
  { db },
): Promise<CollectionComplete> {
  const collection = await dbGetCollectionBySlug(db, slug);

  if (!collection) {
    throw new NotFoundError(slug);
  }

  return collection;
}

/**
 * @param parent
 * @param page
 * @param perPage
 * @param filters
 * @param db
 */
export async function getCollections(
  parent,
  {
    page = 1,
    perPage = config.app.pagination.collectionsPerPage,
    filters = {},
  },
  { db },
): Promise<CollectionsResult> {
  // guard against null values
  // note: graphql will accept `null` for any optional input field, regardless
  // of type. there may be a custom schema extension way to handle this at the
  // graph level...
  page = page ?? 1;
  perPage = perPage ?? config.app.pagination.collectionsPerPage;

  const totalResults = await countPublishedCollections(db, filters);
  const collections = await getPublishedCollections(db, page, perPage, filters);

  return {
    pagination: getPagination(totalResults, page, perPage),
    collections,
  };
}

export async function resolveReference({ slug }, { dataLoaders }) {
  if (!slug) {
    throw new UserInputError('Collection referenced without slug');
  }

  const collection = await dataLoaders.collectionLoader.load(slug);

  if (!collection) {
    throw new NotFoundError(slug);
  }

  return collection;
}
