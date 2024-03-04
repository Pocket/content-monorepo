import {
  SQSEvent,
  SQSHandler,
  SQSBatchItemFailure,
  SQSBatchResponse,
} from 'aws-lambda';
import * as Sentry from '@sentry/serverless';
import config from './config';
import { processAndScheduleCandidate } from './utils';

Sentry.AWSLambda.init({
  dsn: config.app.sentry.dsn,
  release: config.app.sentry.release,
  environment: config.app.environment,
  serverName: config.app.name,
});

// temp log statements
console.log('corpus scheduler lambda');

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 * @returns SQSBatchResponse (all failed records)
 */
export const processor: SQSHandler = async (
  event: SQSEvent,
): Promise<SQSBatchResponse> => {
  // prevents successful records showing up in the queue if there were some failed records
  // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
  const failedItems: SQSBatchItemFailure[] = [];

  for await (const record of event.Records) {
    try {
      await processAndScheduleCandidate(record);
    } catch (error) {
      console.warn(`Unable to process message -> Reason: ${error}`);
      Sentry.captureException(error);
      Sentry.addBreadcrumb({
        message: `Unable to process message -> Reason: ${error}`,
      });
      failedItems.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failedItems };
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
