import { DateResolver } from 'graphql-scalars';
import { getScheduledSurface } from './queries/ScheduledSurface';
import { getItemsForScheduledSurface } from './queries/ScheduledSurfaceItem';
import { IPublicContext } from '../context';

export const resolvers = {
  // The Date resolver enforces the date to be in the YYYY-MM-DD format.
  Date: DateResolver,
  ScheduledSurface: {
    // The `items` subquery pulls in scheduled corpus items for a given date.
    items: getItemsForScheduledSurface,
  },
  // The `CorpusItem` resolver resolves approved corpus items based on id.
  CorpusItem: {
    __resolveReference: async (corpusItem, context: IPublicContext) => {
      if (corpusItem.id) {
        return await context.dataLoaders.corpusItemsById.load(corpusItem.id);
      } else {
        return await context.dataLoaders.corpusItemsByUrl.load(corpusItem.url);
      }
    },
  },
  // Allow the `SavedItem` to resolve the corpus item
  SavedItem: {
    corpusItem: async (item, args, context: IPublicContext) => {
      const corpusItem = await context.dataLoaders.corpusItemsByUrl.load(
        item.url,
      );

      if (!corpusItem) {
        return null;
      }

      return corpusItem;
    },
  },
  // Allow the `Item` to resolve the corpus item
  Item: {
    corpusItem: async (item, args, context: IPublicContext) => {
      const { givenUrl, resolvedUrl } = item;

      // try to get the corpusItem by the item's givenUrl
      let corpusItem = await context.dataLoaders.corpusItemsByUrl.load(
        givenUrl,
      );

      // if the item's givenUrl didn't return a corpusItem, and if the item has
      // a resolvedUrl, try finding the corpusItem by resolvedUrl
      if (!corpusItem && resolvedUrl) {
        corpusItem = await context.dataLoaders.corpusItemsByUrl.load(
          resolvedUrl,
        );
      }

      // return the corpusItem or null
      return corpusItem || null;
    },
  },
  Query: {
    // Gets the metadata for a Scheduled Surface (for example, New Tab).
    scheduledSurface: getScheduledSurface,
  },
};
