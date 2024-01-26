import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { SqsProspectSet } from './types';
import { assert } from 'typia';

Sentry.AWSLambda.init({
  dsn: config.sentry.dsn,
  release: config.sentry.release,
  environment: config.environment,
  includeLocalVariables: true,
  integrations: [
    new Sentry.Integrations.LocalVariables({
      captureAllExceptions: true,
    }),
  ],
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

  try {
    // Validate that body is a SqsProspectSet. If not, throws TypeGuardError to Sentry.
    const data = JSON.parse(body);
    assert<SqsProspectSet>(data);

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
  } catch (e) {
    // Due to an open Node.js issue, Sentry is currently unable to capture local variables for unhandled errors when
    // using JavaScript modules (ESM). We can work around this issue by wrapping our code in try/catch and enabling the
    // captureAllExceptions option when initializing Sentry.
    // https://docs.sentry.io/platforms/node/configuration/integrations/default-integrations/#localvariables
    Sentry.captureException(e);
  }
};

// the actual function has to be wrapped in order for sentry to work
// export const handler = Sentry.AWSLambda.wrapHandler(processor);
export const handler = Sentry.AWSLambda.wrapHandler(processor);
