import * as Sentry from '@sentry/serverless';
import { SQSEvent, SQSHandler } from 'aws-lambda';

import config from './config';
import { getJwtBearerToken } from './jwt';
import { SqsSectionWithSectionItems } from './types';
import { processSqsSectionData } from './utils';
import { validateSqsData } from './validators';

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
  // due to SQS message size limit of 256kb, this lambda is expected to process
  // one Section per SQS message

  // make sure only one record was passed in
  if (event.Records.length > 1) {
    Sentry.captureException(
      `expected 1 record in SQS message, received ${event.Records.length}`,
    );

    return;
  }

  // validate structure of record
  const sqsSectionData: SqsSectionWithSectionItems = JSON.parse(
    event.Records[0].body,
  );

  // during testing, log the data coming in from SQS/ML
  console.log(sqsSectionData);

  validateSqsData(sqsSectionData);

  // retrieve JWT bearer token for use in graph calls
  const jwtBearerToken = await getJwtBearerToken();

  // create or update section
  // create approved items (if url doesn't already exist in the corpus)
  // create section items
  await processSqsSectionData(sqsSectionData, jwtBearerToken);
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
