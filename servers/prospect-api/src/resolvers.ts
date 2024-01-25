import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import {
  deriveUrlMetadata,
  Prospect,
  UrlMetadata,
  getProspectById,
} from 'prospectapi-common';

import {
  getProspects,
  updateProspectAsCurated,
  dynamoItemToProspect,
} from './aws/dynamodb/lib';
import config from './config';

import {
  getScheduledSurfaceByGuid,
  isValidProspectType,
  getRandomizedSortedRankedProspects,
  getProspectsSortedByAscendingRank,
  getSortedRankedProspects,
  findAndLogTrueDuplicateProspects,
  deDuplicateProspectUrls,
  prospectToSnowplowProspect,
  parseReasonsCsv,
} from './lib';

import { GetProspectsFilters, Context } from './types';
//import { sendEventBridgeEvent } from './events/events';
import { getEmitter, getTracker, queueSnowplowEvent } from './events/snowplow';

/**
 * Return an object conforming to the Item graphql definition.
 *
 * @param parent // a ProspectItem
 */
export const ItemResolver = (parent) => {
  return {
    givenUrl: parent.url,
  };
};

export const resolvers = {
  Prospect: {
    item: ItemResolver,
  },
  Query: {
    getProspects: async (
      parent,
      { filters }: GetProspectsFilters,
      { db, userAuth }: Context,
    ): Promise<Prospect[]> => {
      const scheduledSurface = getScheduledSurfaceByGuid(
        filters.scheduledSurfaceGuid,
      );

      // validate filters
      if (scheduledSurface === undefined) {
        throw new UserInputError(
          `${filters.scheduledSurfaceGuid} isn't a valid scheduled surface guid!`,
        );
      }

      if (filters.prospectType) {
        if (
          !isValidProspectType(
            filters.scheduledSurfaceGuid,
            filters.prospectType,
          )
        ) {
          throw new UserInputError(
            `${filters.prospectType} is not a valid prospect type for scheduled surface ${scheduledSurface.name}`,
          );
        }
      }
      // check if user has read access for this query
      if (!userAuth.canRead(filters.scheduledSurfaceGuid)) {
        throw new AuthenticationError('Not authorized for action');
      }

      // get prospects
      let prospects: Prospect[] = await getProspects(db, filters);

      // de-duplicate prospects based on duplicate urls
      prospects = deDuplicateProspectUrls(prospects);

      if (filters.prospectType) {
        // sort prospects by ascending rank and return the default batch size of them
        prospects = getProspectsSortedByAscendingRank(prospects).slice(
          0,
          config.app.prospectBatchSize,
        );
      } else {
        // randomize by prospect type and sort by descending rank
        const sortedRankedProspects = getSortedRankedProspects(prospects);
        prospects = getRandomizedSortedRankedProspects(sortedRankedProspects);
      }

      // check if the prospects have any true duplicates and log to Sentry
      findAndLogTrueDuplicateProspects(prospects);

      return prospects;
    },
    getUrlMetadata: async (parent, { url }, ctx): Promise<UrlMetadata> => {
      let itemUrl = '';
      try {
        // validate url by throwing if url format is incorrect
        itemUrl = new URL(url).toString();
      } catch (error) {
        throw new UserInputError(`${url} is not a valid url `);
      }
      return await deriveUrlMetadata(itemUrl);
    },
  },
  Mutation: {
    updateProspectAsCurated: async (
      parent,
      { id },
      { db, userAuth }: Context,
    ): Promise<Prospect | null> => {
      // fetch prospect from db first
      const prospect = dynamoItemToProspect(await getProspectById(db, id));

      // check if user has write access for this mutation
      if (!userAuth.canWrite(prospect.scheduledSurfaceGuid)) {
        throw new AuthenticationError('Not authorized for action');
      }

      return updateProspectAsCurated(db, id);
    },
    dismissProspect: async (
      parent,
      { id },
      { db, userAuth }: Context,
    ): Promise<Prospect | null> => {
      // fetch prospect from db first
      const prospect = dynamoItemToProspect(await getProspectById(db, id));

      // check if user has write access for this mutation
      if (!userAuth.canWrite(prospect.scheduledSurfaceGuid)) {
        throw new AuthenticationError('Not authorized for action');
      }

      // 2022-11-10: event bridge on pause while system stability is improved.
      // will go back to this code/send when event bridge is ready.
      // Send the 'Dismiss' event to Pocket event bridge
      // await sendEventBridgeEvent(prospect, userAuth);

      // in the mean time, send the dismiss event directly to snowplow
      // initialize snowplow tracker
      const snowplowEmitter = getEmitter();
      const snowplowTracker = getTracker(snowplowEmitter);
      queueSnowplowEvent(
        snowplowTracker,
        'prospect_reviewed',
        prospectToSnowplowProspect(prospect, userAuth.username),
      );

      return updateProspectAsCurated(db, id);
    },
    removeProspect: async (
      parent,
      { data },
      { db, userAuth }: Context,
    ): Promise<Prospect | null> => {
      const { id, reason, reasonComment } = data;

      // fetch prospect from db first
      const prospect = dynamoItemToProspect(await getProspectById(db, id));

      // check if user has write access for this mutation
      if (!userAuth.canWrite(prospect.scheduledSurfaceGuid)) {
        throw new AuthenticationError('Not authorized for action');
      }

      // 2024-01-24: keeping the below comment for if/when we send these events
      // to event bridge instead of snowplow.

      // 2022-11-10: event bridge on pause while system stability is improved.
      // will go back to this code/send when event bridge is ready.
      // Send the 'Dismiss' event to Pocket event bridge
      // await sendEventBridgeEvent(prospect, userAuth);

      // in the mean time, send the dismiss event directly to snowplow
      // initialize snowplow tracker
      const snowplowEmitter = getEmitter();
      const snowplowTracker = getTracker(snowplowEmitter);
      queueSnowplowEvent(
        snowplowTracker,
        'prospect_reviewed',
        prospectToSnowplowProspect(
          prospect,
          userAuth.username,
          parseReasonsCsv(reason),
          reasonComment,
        ),
      );

      return updateProspectAsCurated(db, id);
    },
  },
};
