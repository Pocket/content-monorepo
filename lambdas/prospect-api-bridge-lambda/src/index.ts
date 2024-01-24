import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';

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
  console.log('raw event:');
  console.log(event);

  let json: any;

  // is the SQS message valid JSON?
  try {
    // this is the (odd?) format of an SQS message
    json = JSON.parse(event.Records[0].body);

    console.log('parsed event body');
    console.log(json);
  } catch (e) {
    Sentry.captureException(
      'invalid data provided / sqs event.Records[0].body is not valid JSON.'
    );

    // no need to do any more processing
    return;
  }
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
