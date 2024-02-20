import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';
// import event from './event.json';
import { getApprovedCorpusItems } from "./createApprovedCorpusItem";
import {ScheduledCandidate} from "./types";

Sentry.AWSLambda.init({
    dsn: config.app.sentry.dsn,
    release: config.app.sentry.release,
    environment: config.app.environment,
    serverName: config.app.name,
});
// temp log statements
console.log('corpus scheduler lambda')

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 */
const processor: SQSHandler = async (event: SQSEvent): Promise<void> => {
    for await (const record of event.Records) {
        try {
            const parsedMessage: ScheduledCandidate = JSON.parse(record.body);
            // temp log statements
            console.log('parsedMessage: ', parsedMessage);
            // TODO: validate & map input (https://mozilla-hub.atlassian.net/browse/MC-648)
            // Wait, don't overwhelm the API
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // TEMP: call getApprovedCorpusItems query to test admin api auth
            // TODO: call createApprovedCorpusItem mutation (https://mozilla-hub.atlassian.net/browse/MC-647)
            const {data} = await getApprovedCorpusItems();
            console.log(`QUERY RESULT: totalCount: ${data.getApprovedCorpusItems.totalCount}`);
        } catch (error) {
            Sentry.captureException(error);
            Sentry.addBreadcrumb({
                message: `Failed to query curated-corpus-api. Reason: ${error}`,
            });
            throw new Error(
                `Failed to query curated-corpus-api. Reason: ${error}`,
            );
        }
    }
};
// TEMP: for running the lambda handler locally
// const sqsEvent: SQSEvent = event as unknown as SQSEvent;
// processor(sqsEvent, null, null);

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);