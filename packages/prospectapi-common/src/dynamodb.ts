import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';

import config from './config';
import { DynamoItem, Prospect } from './types';
import { toUnixTimestamp } from './lib';

/**
 * test helper method for integration tests. essentially a way to retrieve all
 * rows in the database - for counting or truncating.
 *
 * @returns ScanCommandOutput - object containing, among other things, an
 * array of Items
 */
export const scanAllRows = async (
  dbClient: DynamoDBDocumentClient,
): Promise<ScanCommandOutput> => {
  return await dbClient.send(
    new ScanCommand({
      TableName: config.aws.dynamoDb.table,
      AttributesToGet: ['id'],
    }),
  );
};

/**
 * converts a Prospect into an expected dynamo record with timestamp
 *
 * @param prospect a Prospect object
 * @returns DynamoDB.PutItemInput
 */
export const generateInsertParams = (prospect: Prospect): PutCommandInput => {
  // in a "live" scenario, the prospect will never have a `createdAt` at
  // the time of insertion.
  // however, for tests we need to set this explicitly.
  const createdAt = prospect.createdAt || toUnixTimestamp();

  // again, in a live scenario, this will always be false. for testing, we
  // need to insert pre-curated prospects
  const curated = prospect.curated || false;

  return {
    TableName: config.aws.dynamoDb.table,
    Item: {
      authors: prospect.authors,
      createdAt,
      curated,
      datePublished: prospect.datePublished,
      domain: prospect.domain,
      excerpt: prospect.excerpt,
      id: prospect.id, // custom GUID
      imageUrl: prospect.imageUrl,
      isCollection: prospect.isCollection,
      isSyndicated: prospect.isSyndicated,
      language: prospect.language,
      // GUID supplied by ML - not unique on purpose!
      prospectId: prospect.prospectId,
      prospectType: prospect.prospectType,
      publisher: prospect.publisher,
      rank: prospect.rank,
      saveCount: prospect.saveCount,
      scheduledSurfaceGuid: prospect.scheduledSurfaceGuid,
      title: prospect.title,
      topic: prospect.topic,
      url: prospect.url,
    },
  };
};

/**
 * test helper method for integration tests
 *
 * note - this will only delete a max of 1MB of data, but we should never
 * hit that in our integration tests
 */
export const truncateDb = async (
  dbClient: DynamoDBDocumentClient,
): Promise<void> => {
  const rows = await scanAllRows(dbClient);

  rows.Items?.forEach(async function (element, _) {
    await dbClient.send(
      new DeleteCommand({
        TableName: config.aws.dynamoDb.table,
        Key: element,
      }),
    );
  });
};

/**
 * inserts a prospect into dynamo
 *
 * @param prospect a Prospect object
 */
export const insertProspect = async (
  dbClient: DynamoDBDocumentClient,
  prospect: Prospect,
): Promise<void> => {
  // convert the prospect to dynamo insert format
  const params = generateInsertParams(prospect);

  await dbClient.send(new PutCommand(params));
};

/**
 * test helper method to verify deletes are working as expected
 *
 * @param id string id of a prospect row in db
 * @returns raw row data from dynamo, undefined if the id wasn't found
 */
export const getProspectById = async (
  dbClient: DynamoDBDocumentClient,
  id: string,
): Promise<DynamoItem> => {
  const input: GetCommandInput = {
    TableName: config.aws.dynamoDb.table,
    Key: {
      id: id,
    },
  };

  const res = await dbClient.send(new GetCommand(input));

  return res.Item;
};
