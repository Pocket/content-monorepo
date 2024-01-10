import * as Sentry from '@sentry/node';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { DynamoItem, GetProspectsFilters, Prospect } from 'prospectapi-common';

import { standardizeLanguage } from '../../lib';
import config from '../../config';

/**
 * converts a raw item from dynamo db into a Prospect object
 *
 * @param item raw row from dynamo
 * @returns Prospect
 */
export const dynamoItemToProspect = (item: DynamoItem): Prospect => {
  return {
    id: item?.id,
    prospectId: item?.prospectId,
    scheduledSurfaceGuid: item?.scheduledSurfaceGuid,
    url: item?.url,
    prospectType: item?.prospectType,
    topic: item?.topic,
    saveCount: item?.saveCount,
    rank: item?.rank,
    createdAt: item?.createdAt,
    // note - curated is not exposed in the graphql API
    curated: item?.curated,
    // the below are optional parser metadata values and may be empty
    domain: item?.domain,
    excerpt: item?.excerpt,
    imageUrl: item?.imageUrl,
    language: standardizeLanguage(item?.language),
    publisher: item?.publisher,
    title: item?.title,
    isSyndicated: item?.isSyndicated,
    isCollection: item?.isCollection,
    authors: item?.authors,
    approvedCorpusItem: { url: item?.url },
    rejectedCorpusItem: { url: item?.url },
  };
};

/**
 * Retrieves all prospects for the given scheduledSurfaceGuid and (optional) prospectType.
 * Additionally, prospects returned can be filtered by publisher (include/exclude).
 *
 * @param dbClient
 * @param filters
 * @returns an array of Prospects
 */
export const getProspects = async (
  dbClient: DynamoDBDocumentClient,
  filters: GetProspectsFilters
): Promise<Prospect[]> => {
  // base key condition - scheduledSurfaceGuid is required here
  let keyConditionExpression = 'scheduledSurfaceGuid = :scheduledSurfaceGuid';

  // base filter expression: not curated items only
  let filterExpression = 'curated = :curated';

  const expressionAttributeValues = {
    ':scheduledSurfaceGuid': filters.scheduledSurfaceGuid,
    ':curated': false, // we only return non-curated prospects here
  };

  // augment key condition if prospectType is provided
  if (filters.prospectType) {
    keyConditionExpression += ' and prospectType = :prospectType';
    expressionAttributeValues[':prospectType'] = filters.prospectType;
  }

  /**
   *   Publisher gets into the mix, if provided.
   *
   *   Unfortunately, filtering is applied post-record retrieval, so
   *   the results returned will almost always be fewer than a full set (50 records).
   *
   *   Additionally, substring search is case-sensitive: this will have to
   *   be made clear on the frontend.
   */
  if (filters.includePublisher) {
    filterExpression += ' AND contains(publisher,:publisher)';
    expressionAttributeValues[':publisher'] = filters.includePublisher;
  }
  if (filters.excludePublisher) {
    filterExpression += ' AND NOT contains(publisher,:publisher)';
    expressionAttributeValues[':publisher'] = filters.excludePublisher;
  }

  const input: QueryCommandInput = {
    TableName: config.aws.dynamoDb.table,
    // this is our Global Secondary Index (GSI)
    IndexName: 'scheduledSurfaceGuid-prospectType',
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    FilterExpression: filterExpression,
  };

  const res = await dbClient.send(new QueryCommand(input));

  if (res.Items?.length) {
    return res.Items.map((item): Prospect => {
      return dynamoItemToProspect(item);
    });
  } else {
    return [];
  }
};

/**
 * marks a prospect in dynamo as curated so it's filtered out of future client
 * requests
 *
 * @param dbClient
 * @param id string id of the prospect in dynamo
 */
export const updateProspectAsCurated = async (
  dbClient: DynamoDBDocumentClient,
  id: string
): Promise<Prospect | null> => {
  const input: UpdateCommandInput = {
    TableName: config.aws.dynamoDb.table,
    Key: {
      id: id,
    },
    UpdateExpression: 'SET curated = :val',
    // if ConditionExpression isn't included, dynamo will just insert a new
    // record if the provided id isn't found. sigh.
    ConditionExpression: 'attribute_exists(id)',
    ExpressionAttributeValues: {
      ':val': true,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const item = await dbClient.send(new UpdateCommand(input));

    // when performing an update, the item attributes are in `Attributes`
    return dynamoItemToProspect(item.Attributes);
  } catch (e: unknown) {
    // if the provided id cannot be found in dynamo, gracefully fail
    // is there an easier way to check the error type below? sheesh...
    if (
      e &&
      typeof e === 'object' &&
      e['name'] === 'ConditionalCheckFailedException'
    ) {
      Sentry.captureException(
        `failed to mark prospect as curated. id ${id} not found in dynamo.`
      );

      return null;
    } else {
      throw e;
    }
  }
};
