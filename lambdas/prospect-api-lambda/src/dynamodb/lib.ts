import * as Sentry from '@sentry/serverless';
import {
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  BatchWriteCommand,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { Prospect, ProspectType, toUnixTimestamp } from 'prospectapi-common';

import config from '../config';

/**
 * retrieves prospects for the given scheduledSurface and prospectType. used
 * when deleting outdated prospects - which happens each time an SQS message is
 * processed.
 *
 * @param scheduledSurfaceGuid string GUID, e.g. 'NEW_TAB_EN_US'
 * @param prospectType string GUID, e.g. 'GLOBAL' or 'TIMESPENT'
 * @param maxAge number of minutes when a prospect is considered 'old' and
 *               ready for deletion
 * @returns an array of Prospects filtered by scheduledSurface and prospectType
 */
export const getProspectsForDeletion = async (
  dbClient,
  scheduledSurfaceGuid: string,
  prospectType: ProspectType,
  maxAge: number = config.aws.dynamoDb.maxAgeBeforeDeletion
): Promise<Prospect[]> => {
  const now = new Date();
  const cutoffDate = toUnixTimestamp(new Date(now.valueOf() - maxAge * 60000));

  const input: QueryCommandInput = {
    TableName: config.aws.dynamoDb.table,
    // this is our Global Secondary Index (GSI)
    IndexName: 'scheduledSurfaceGuid-prospectType',
    // because `prospectType` is the RANGE (meaning sort) key on the Global
    // Secondary Index, we can refine results with the `and` clause
    KeyConditionExpression:
      'scheduledSurfaceGuid = :scheduledSurfaceGuid and prospectType = :prospectType',
    // note that FilterExpression happens *after* dynamo's 1MB result set
    // limit. we shouldn't hit this limit based on the KeyCondtionExpression
    // above - but we do log to sentry below if it happens
    FilterExpression: 'createdAt <= :cutoffDate',
    ExpressionAttributeValues: {
      ':scheduledSurfaceGuid': scheduledSurfaceGuid,
      ':prospectType': prospectType,
      ':cutoffDate': cutoffDate,
    },
  };

  const res: QueryCommandOutput = await dbClient.send(new QueryCommand(input));

  // LastEvaluatedKey will only be present if there are multiple pages of
  // results from the query - which means we have more than 1MB of data for
  // the given `scheduledSurfaceGuid` and `prospectType`. we do not expect this
  //  to ever happen, but we should be alerted in some way if it does.
  if (res.LastEvaluatedKey) {
    Sentry.captureMessage(
      `method 'getProspectsByScheduledSurfaceGuidAndProspectType' called with '${scheduledSurfaceGuid}' and '${prospectType}' has multiple pages of results that we are not handling!`
    );
  }

  if (res.Items?.length) {
    return res.Items.map((item): Prospect => {
      // force type safety
      return {
        id: item.id,
        prospectId: item.prospectId,
        scheduledSurfaceGuid: item.scheduledSurfaceGuid,
        url: item.url,
        prospectType: item.prospectType,
        topic: item.topic,
        saveCount: item.saveCount,
        createdAt: item.createdAt,
        curated: item.curated,
        rank: item.rank,
      };
    });
  } else {
    return [];
  }
};

/**
 * deletes a batch of prospects by ids. maximum batch size is 25 (dynamo limit)
 *
 * @param prospectIds array of string ids
 */
export const batchDeleteProspects = async (
  dbClient,
  prospectIds: string[]
): Promise<void> => {
  // basic check
  if (prospectIds.length > config.aws.dynamoDb.maxBatchDelete) {
    throw new Error(
      `cannot delete more than ${config.aws.dynamoDb.maxBatchDelete} dynamo items at once! you are trying to delete ${prospectIds.length}!`
    );
  }

  // dynamo syntax is...a thing, huh?
  const writeRequests = prospectIds.map((prospectId: string) => {
    return {
      DeleteRequest: {
        Key: {
          // we can delete on id because it's our primary index
          id: prospectId,
        },
      },
    };
  });

  const input: BatchWriteCommandInput = {
    RequestItems: {
      [config.aws.dynamoDb.table]: writeRequests,
    },
  };

  await dbClient.send(new BatchWriteCommand(input));
};

/**
 * deletes all old prospects matching the given scheduledSurfaceGuid and
 * prospectType
 *
 * @param scheduledSurfaceGuid string guid of new tab, e.g. 'EN_US'
 * @param prospectType ProspectType value
 *
 * @returns number of prospects deleted
 */
export const deleteOldProspects = async (
  dbClient,
  scheduledSurfaceGuid: string,
  prospectType: ProspectType
): Promise<number> => {
  // retrieve all prospects matching the scheduledSurfaceGuid and prospectType
  const prospectsToDelete = await getProspectsForDeletion(
    dbClient,
    scheduledSurfaceGuid,
    prospectType
  );

  let idsToDelete: string[] = [];

  // delete the prospects in batches
  for (let i = 0; i < prospectsToDelete.length; i++) {
    idsToDelete.push(prospectsToDelete[i].id);

    if (idsToDelete.length === config.aws.dynamoDb.maxBatchDelete) {
      await batchDeleteProspects(dbClient, idsToDelete);
      idsToDelete = [];
    }
  }

  if (idsToDelete.length) {
    await batchDeleteProspects(dbClient, idsToDelete);
  }

  return prospectsToDelete.length;
};
