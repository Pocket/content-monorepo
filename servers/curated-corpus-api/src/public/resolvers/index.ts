import { DateResolver } from 'graphql-scalars';
import { getScheduledSurface } from './queries/ScheduledSurface';
import { getItemsForScheduledSurface } from './queries/ScheduledSurfaceItem';
import { getSections } from './queries/Section';
import { IPublicContext } from '../context';
import { getCorpusItemFromApprovedItem } from '../../shared/utils';

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
  SectionItem: {
    corpusItem: (item) => {
      return getCorpusItemFromApprovedItem(item.approvedItem);
    },
  },
  Query: {
    // Gets the metadata for a Scheduled Surface (for example, New Tab).
    scheduledSurface: getScheduledSurface,
    getSections: getSections,
  },
};
