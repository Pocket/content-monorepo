import { SQSEvent, SQSHandler } from 'aws-lambda';
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
 * @exception Error Raises an exception on error, which causes the batch to be retried.
 *  Lambda batchSize is 1 to avoid retrying successfully processed records.
 */
export const processor: SQSHandler = async (event: SQSEvent) => {
  // We have set batchSize to 1, so the follow for loop is expected to have 1 iteration.
  for await (const record of event.Records) {
    await processAndScheduleCandidate(record);
  }
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
