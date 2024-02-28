import {SQSEvent, SQSHandler, SQSBatchItemFailure, SQSBatchResponse} from 'aws-lambda';
import * as Sentry from '@sentry/serverless';
import config from './config';
// import event from './event.json';
import {processSQSMessages} from "./utils";

Sentry.AWSLambda.init({
    dsn: config.app.sentry.dsn,
    release: config.app.sentry.release,
    environment: config.app.environment,
    serverName: config.app.name,
});

enum AllowedScheduledSurfaces {
    NewTabEnUs = 'NEW_TAB_EN_US'
}
// temp log statements
console.log('corpus scheduler lambda')

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 * @returns SQSBatchResponse (all failed records)
 */
export const processor: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
    // prevents successful records showing up in the queue if there were some failed records
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
    const failedItems: SQSBatchItemFailure[] = [];

    for await (const record of event.Records) {
        try {
            // if scheduled surface found in enum & env is dev, process candidates
            if (Object.values(AllowedScheduledSurfaces).includes('NEW_TAB_EN_US' as AllowedScheduledSurfaces.NewTabEnUs) && config.app.isDev) {
                await processSQSMessages(record);
            }
            // if env is not dev, don't process candidates (for now)
            if (!config.app.isDev) {
                console.log(`candidate scheduling is not allowed in ${config.app.environment} environment`);
            }
        } catch (error) {
            console.warn(`Unable to process message -> Reason: ${error}`);
            Sentry.captureException(error);
            Sentry.addBreadcrumb({
                message: `Unable to process message -> Reason: ${error}`,
            });
            failedItems.push({itemIdentifier: record.messageId})
        }
    }
    return { batchItemFailures: failedItems };
};
// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);