import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import config from './config';

// base dynamo client
const dynamo = new DynamoDBClient({
  apiVersion: '2012-08-10',
  endpoint: config.aws.localEndpoint,
  region: config.aws.region,
});

// from the docs:
// https://www.npmjs.com/package/@aws-sdk/lib-dynamodb
// The document client simplifies working with items in Amazon DynamoDB by
// abstracting away the notion of attribute values. This abstraction annotates
// native JavaScript types supplied as input parameters, as well as converts
// annotated response data to native JavaScript types.
//
// basically this makes it much easier to work with dynamo
export const dbClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
  dynamo,
  {
    marshallOptions: {
      // if any values of an object trying to be inserted are undefined,
      // (as they may well be in regards to parser metadata) do not insert
      // those values into the db.
      //
      // dynamo actually errors out if this is left as the default `false`.
      removeUndefinedValues: true,
    },
  },
);
