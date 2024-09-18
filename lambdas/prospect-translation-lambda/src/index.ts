import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import { dbClient, Prospect } from 'prospectapi-common';

import config from './config';
import { SqsProspect } from './types';
import { ProspectFeatures, ProspectRunDetails } from 'content-common';

import {
  getProspectsFromMessageJson,
  convertSqsProspectToProspect,
  validateStructure,
  processProspect,
  parseJsonFromEvent,
  validateProperties,
  getProspectRunDetailsFromMessageJson,
} from './lib';

import { deleteOldProspects } from './dynamodb/lib';
import { getEmitter, getTracker } from 'content-common/snowplow';

// little sentry initialization. no big deal.
Sentry.AWSLambda.init({
  dsn: config.app.sentry.dsn,
  release: config.app.sentry.release,
  environment: config.app.environment,
  serverName: config.app.name,
});

/**
 * validates the SQS message, and, if valid, clears old dynamodb entries
 * matching the ScheudledSurface (e.g. `NEW_TAB_EN_US`) and prospectType
 * (e.g. `TIMESPENT`), and inserts the new prospects
 * @param event data from an SQS message - should be an array of prospect
 * objects
 */
export const processor: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const emitter = getEmitter();
  const tracker = getTracker(emitter, config.snowplow.appId);

  // this is nice to have for easy viewing of the full event in lambda logs
  console.log('raw event:');
  console.log(event);

  let prospectIdsProcessed: string[] = [];

  // make sure the event payload is JSON-parseable and of SQS shape
  // this function will send an exception to sentry if the json cannot be
  // parsed. in that case, it will return an empty object.
  const json = parseJsonFromEvent(event);

  // pull prospects out of the event's JSON
  // this function will send an exception to sentry if prospects cannot be
  // found in the json. in that case, it will return an empty array.
  const rawSqsProspects: Array<any> = getProspectsFromMessageJson(json);

  // iterate over each prospect, populating the metadata and inserting into
  // dynamo
  for (let i = 0; i < rawSqsProspects.length; i++) {
    const rawSqsProspect = rawSqsProspects[i];

    // validate all necessary data points are present to conform to the
    // SqsProspect type
    // this function will send an exception to sentry if the structure is not
    // valid.
    if (validateStructure(rawSqsProspect)) {
      // if the prospect is a valid SqsProspect, validate property data
      // this function will send an exception to sentry if any of the
      // properties of the prospect are invalid.
      if (validateProperties(rawSqsProspect as SqsProspect)) {
        // the run details for the prospects in the SQS message
        const runDetails: ProspectRunDetails =
          getProspectRunDetailsFromMessageJson(json);
        // the ML features
        const features: ProspectFeatures = {
          data_source: rawSqsProspect.data_source || 'prospect',
          rank: rawSqsProspect.rank,
          save_count: rawSqsProspect.save_count,
          predicted_topic: rawSqsProspect.predicted_topic,
        };
        // convert Sqs formatted data to our standard format
        const prospect: Prospect = convertSqsProspectToProspect(rawSqsProspect);

        // we have a valid prospect!

        // if this is the first pass through the loop, use this opportunity to
        // delete all existing prospects of this type/surface
        if (i === 0) {
          // this function will send an exception to sentry if the deletion
          // process fails.
          const deletedCount = await deleteOldProspects(
            dbClient,
            prospect.scheduledSurfaceGuid,
            prospect.prospectType,
          );

          console.log(
            `deleted ${deletedCount} prospects for ${prospect.scheduledSurfaceGuid} / ${prospect.prospectType}`,
          );
        }

        // now get the metadata and put it into dynamo
        // this function will send an exception to sentry if any part of it
        // fails.
        prospectIdsProcessed = await processProspect(
          prospect,
          prospectIdsProcessed,
          rawSqsProspect.prospect_source,
          runDetails,
          features,
          tracker,
        );
      }
    }
  }

  // Ensure all Snowplow events are emitted before the Lambda exits.
  emitter.flush();

  // Flush processes the HTTP request in the background, so we need to wait here.
  await new Promise((resolve) =>
    setTimeout(resolve, config.snowplow.emitterDelay),
  );

  console.log(`${prospectIdsProcessed.length} prospects inserted into dynamo.`);
  console.log(
    `${
      rawSqsProspects.length - prospectIdsProcessed.length
    } prospects had errors.`,
  );
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
