import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import { dbClient, Prospect } from 'prospectapi-common';

import config from './config';
import { SqsProspect } from './types';

import {
  getProspectsFromMessageJson,
  convertSqsProspectToProspect,
  validateStructure,
  processProspect,
  parseJsonFromEvent,
  validateProperties,
} from './lib';

import { deleteOldProspects } from './dynamodb/lib';

// little sentry initialization. no big deal.
Sentry.AWSLambda.init({
  dsn: config.app.sentry.dsn,
  release: config.app.sentry.release,
  environment: config.environment,
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
  // this is nice to have for easy viewing of the full event in lambda logs
  console.log('raw event:');
  console.log(event);

  let prospectIdsProcessed: string[] = [];

  // make sure the event payload is JSON-parseable and of SQS shape
  const json = parseJsonFromEvent(event);

  // pull prospects out of the event's JSON
  const rawSqsProspects: Array<any> = getProspectsFromMessageJson(json);

  // iterate over each prospect, populating the metadata and inserting into
  // dynamo
  for (let i = 0; i < rawSqsProspects.length; i++) {
    const rawSqsProspect = rawSqsProspects[i];

    // validate all necessary data points are present to conform to the
    // SqsProspect type
    if (validateStructure(rawSqsProspect)) {
      // if the prospect is a valid SqsProspect, validate property data
      if (validateProperties(rawSqsProspect as SqsProspect)) {
        // convert Sqs formatted data to our standard format
        const prospect: Prospect = convertSqsProspectToProspect(rawSqsProspect);

        // we have a valid prospect!
        // now get the metadata and put it into dynamo
        prospectIdsProcessed = await processProspect(
          prospect,
          prospectIdsProcessed,
        );

        // if this is the first pass through the loop, use this opportunity to
        // delete all existing prospects of this type/surface
        // on the first pass through the loop only, delete all old prospects
        // of the same scheduled surface and prospect type
        if (i === 0) {
          const deletedCount = await deleteOldProspects(
            dbClient,
            prospect.scheduledSurfaceGuid,
            prospect.prospectType,
          );

          console.log(
            `deleted ${deletedCount} prospects for ${prospect.scheduledSurfaceGuid} / ${prospect.prospectType}`,
          );
        }
      }
    }
  }

  console.log(`${prospectIdsProcessed.length} prospects inserted into dynamo.`);
  console.log(
    `${
      rawSqsProspects.length - prospectIdsProcessed.length
    } prospects had errors.`,
  );
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
