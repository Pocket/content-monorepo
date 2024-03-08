import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';
import { ProspectCandidateSet } from './types';
import { assert } from 'typia';

Sentry.AWSLambda.init({
  dsn: config.sentry.dsn,
  release: config.sentry.release,
  environment: config.environment,
});

/**
 * @param event data from an SQS message - should be an array of prospect
 * objects
 */
const processor: SQSHandler = async (event: SQSEvent): Promise<void> => {
  // this is the (odd?) format of an SQS message
  const body = event.Records[0].body;
  console.log('body:');
  console.log(body);

  // Validate that body is a SqsProspectSet. If not, throws TypeGuardError to Sentry.
  const data = JSON.parse(body);
  assert<ProspectCandidateSet>(data);

  // Send the json-encoded body to EventBridge and Firehose.
  await sendToEventBridge(body); // From EventBridge prospects will go to prospect-api-translation-lambda.
  await sendToFirehose(body); // From Firehose prospects will go to Snowflake.
};

/**
 * @param body String to be sent to the EventBridge bus defined in config.
 */
async function sendToEventBridge(body: string) {
  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        EventBusName: config.aws.eventBridge.eventBusName,
        Source: config.aws.eventBridge.source,
        DetailType: config.aws.eventBridge.detailType,
        Detail: body,
      },
    ],
  });
  const eventBridgeClient = new EventBridgeClient({});
  await eventBridgeClient.send(putEventsCommand);
}

/**
 * @param body String to be sent to the Firehose defined in config.
 */
async function sendToFirehose(body: string) {
  try {
    const firehoseClient = new FirehoseClient({});
    const putRecordCommand = new PutRecordCommand({
      DeliveryStreamName: config.aws.firehose.deliveryStreamName, // Ensure this is defined in your config
      Record: {
        // Kinesis Data Firehose buffers records before delivering them to the destination. To disambiguate the data blobs
        // at the destination, we use a newline (\n) delimiter in the data. This mimics put_results in our Metaflow repo:
        // https://github.com/Pocket/dl-metaflow-jobs/blob/main/jobs/common/utils.py#L200
        Data: new TextEncoder().encode(`${body}\n`),
      },
    });

    await firehoseClient.send(putRecordCommand);
  } catch (e) {
    console.log('failed sending to firehose');
    console.log(e);
  }
}

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
