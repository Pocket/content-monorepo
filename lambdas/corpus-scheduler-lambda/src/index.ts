import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';
import config from './config';
import {
  generateJwt,
  getCorpusSchedulerLambdaPrivateKey,
  processAndScheduleCandidate,
} from './utils';

Sentry.AWSLambda.init({
  dsn: config.app.sentry.dsn,
  release: config.app.sentry.release,
  environment: config.app.environment,
  serverName: config.app.name,
});

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 * @exception Error Raises an exception on error, which causes the batch to be retried.
 *  Lambda batchSize is 1 to avoid retrying successfully processed records.
 */
export const processor: SQSHandler = async (event: SQSEvent) => {
  // node env treats booleans as string, so check for equality
  // if allowed to schedule, proceed with flow
  if (config.app.allowedToSchedule === 'true') {
    //admin api requires jwt token, generate it once
    // to avoid hitting secrets managers in AWS several times per candidate
    const bearerToken = 'Bearer '.concat(
      generateJwt(await getCorpusSchedulerLambdaPrivateKey(config.jwt.key)),
    );

    // We have set batchSize to 1, so the follow for loop is expected to have 1 iteration.
    for await (const record of event.Records) {
      await processAndScheduleCandidate(record, bearerToken);
    }
  }
  // log if not allowed to schedule
  else {
    console.log('Scheduler lambda not allowed to schedule...');
  }
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
