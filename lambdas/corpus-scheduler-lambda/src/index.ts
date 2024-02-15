import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';
import event from './event.json';
import { getApprovedCorpusItems } from "./createApprovedCorpusItem";

Sentry.AWSLambda.init({
    dsn: config.app.sentry.dsn,
    release: config.app.sentry.release,
    environment: config.app.environment,
});

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 */
const processor: SQSHandler = async (event: SQSEvent): Promise<void> => {
    for await (const record of event.Records) {
        const parsedMessage = JSON.parse(record.body);
        // console.log('parsedMessage: ', parsedMessage);
        // TODO: validate & map input (https://mozilla-hub.atlassian.net/browse/MC-648)
        // Wait, don't overwhelm the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // call createApproved
        await getApprovedCorpusItems();

    }
};
const sqsEvent: SQSEvent = event as unknown as SQSEvent;
console.log('corpus scheduler lambda')
processor(sqsEvent, null, null);

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);