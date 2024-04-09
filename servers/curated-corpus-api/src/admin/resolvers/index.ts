import { DateResolver, NonNegativeIntResolver } from 'graphql-scalars';
import { UnixTimestampResolver } from './fields/UnixTimestamp';
import {
  getApprovedItems,
  getApprovedItemByExternalId,
  getApprovedItemByUrl,
  getScheduledSurfaceHistory,
} from './queries/ApprovedItem';
import { getScheduledSurfacesForUser } from './queries/ScheduledSurface';
import { getRejectedItems } from './queries/RejectedItem';
import { getScheduledItems } from './queries/ScheduledItem';
import {
  createApprovedItem,
  rejectApprovedItem,
  updateApprovedItem,
  uploadApprovedItemImage,
} from './mutations/ApprovedItem';
import { createRejectedItem } from './mutations/RejectedItem';
import {
  createScheduledItem,
  deleteScheduledItem,
  rescheduleScheduledItem,
} from './mutations/ScheduledItem';
import {
  getApprovedItemByUrl as dbGetApprovedItemByUrl,
  getRejectedItemByUrl as dbGetRejectedItemByUrl,
} from '../../database/queries';
import { getOpenGraphFields } from './queries/OpenGraphFields';

export const resolvers = {
  // The custom scalars from GraphQL-Scalars that we find useful.
  Date: DateResolver,
  NonNegativeInt: NonNegativeIntResolver,

  ApprovedCorpusItem: {
    // Our own entities that need timestamp conversion, hence field resolvers
    // everywhere for values returned by `createdAt` and `updatedAt` fields.
    createdAt: UnixTimestampResolver,
    updatedAt: UnixTimestampResolver,

    // Resolve reference to approved items by the `url` field.
    __resolveReference: async (item, { db }) => {
      const { url } = item;

      /**
       * Even though it appears that we're querying the partner up to four times
       * to retrieve the information for the four fields below, Prisma is actually
       * batching the queries behind the scenes and there is no performance hit.
       *
       * It is also returning items in the correct order for us.
       * Docs here: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance
       */
      return dbGetApprovedItemByUrl(db, url);
    },

    // The `scheduledSurfaceHistory` subquery pulls in data on most recent
    // scheduling of a curated item onto a surface.
    scheduledSurfaceHistory: getScheduledSurfaceHistory,
  },
  RejectedCorpusItem: {
    createdAt: UnixTimestampResolver,

    // Resolve reference to approved items by the `url` field.
    __resolveReference: async (item, { db }) => {
      const { url } = item;

      /**
       * Even though it appears that we're querying the partner up to four times
       * to retrieve the information for the four fields below, Prisma is actually
       * batching the queries behind the scenes and there is no performance hit.
       *
       * It is also returning items in the correct order for us.
       * Docs here: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance
       */
      return dbGetRejectedItemByUrl(db, url);
    },
  },
  ScheduledCorpusItem: {
    createdAt: UnixTimestampResolver,
    updatedAt: UnixTimestampResolver,
  },
  // The queries available
  Query: {
    approvedCorpusItemByExternalId: getApprovedItemByExternalId,
    getApprovedCorpusItems: getApprovedItems,
    getRejectedCorpusItems: getRejectedItems,
    getScheduledCorpusItems: getScheduledItems,
    getApprovedCorpusItemByUrl: getApprovedItemByUrl,
    getScheduledSurfacesForUser: getScheduledSurfacesForUser,
    getOpenGraphFields: getOpenGraphFields,
  },
  // Mutations that we need in the admin interface
  Mutation: {
    createApprovedCorpusItem: createApprovedItem,
    rejectApprovedCorpusItem: rejectApprovedItem,
    updateApprovedCorpusItem: updateApprovedItem,
    createRejectedCorpusItem: createRejectedItem,
    createScheduledCorpusItem: createScheduledItem,
    deleteScheduledCorpusItem: deleteScheduledItem,
    rescheduleScheduledCorpusItem: rescheduleScheduledItem,
    uploadApprovedCorpusItemImage: uploadApprovedItemImage,
  },
};
