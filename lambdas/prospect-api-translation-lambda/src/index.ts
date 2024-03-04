import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import {
  Prospect,
  dbClient,
  insertProspect,
  deriveUrlMetadata,
} from 'prospectapi-common';

import config from './config';
import { SqsProspect } from './types';

import {
  getProspectsFromMessageJson,
  convertSqsProspectToProspect,
  hasValidStructure,
  hydrateProspectMetadata,
  validateProperties,
} from './lib';

import { deleteOldProspects } from './dynamodb/lib';

// little sentry initialization. no big deal.
Sentry.AWSLambda.init({
  dsn: config.sentry.dsn,
  release: config.sentry.release,
  environment: config.environment,
});

/**
 * validates the SQS message, and, if valid, clears old dynamodb entries
 * matching the ScheudledSurface (e.g. `NEW_TAB_EN_US`) and prospectType
 * (e.g. `TIMESPENT`), and inserts the new prospects
 * @param event data from an SQS message - should be an array of prospect
 * objects
 */
const processor: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log('raw event:');
  console.log(event);

  let json: any;
  // this is raw data from SQS so we don't yet know if it conforms to the
  // Prospect interface - hence `any`
  let sqsProspects: Array<any> = [];
  let sqsProspect: SqsProspect;
  let prospect: Prospect;
  // store any error that may be encountered while processing for logging
  let errors: string[] = [];
  let prospectsProcessed = 0;
  let prospectsErrored = 0;

  // is the SQS message valid JSON?
  try {
    // this is the (odd?) format of an SQS message
    json = JSON.parse(event.Records[0].body);

    // we encountered some weird SQS behavior where multiple prospect messages
    // were coming in. this was during an aws incident so may have been a fluke
    // but - let's log to sentry if this happens again just in case.

    // if the above json conversion succeeds, this check should also succeed
    // (as `Records` is verified to be an array).
    if (event.Records.length > 1) {
      Sentry.captureMessage('multiple records found in SQS message');
    }
  } catch (e) {
    Sentry.captureException(
      'invalid data provided / sqs event.Records[0].body is not valid JSON.',
    );

    // no need to do any more processing
    return;
  }

  // does the SQS JSON contain the expected data?
  sqsProspects = getProspectsFromMessageJson(json);

  if (!sqsProspects) {
    Sentry.captureException(
      'no `candidates` property exists on the SQS JSON, or `candidates` is not an array.',
    );

    // we don't have any prospects, so we're done
    return;
  }

  const idsProcessed = [];

  for (let i = 0; i < sqsProspects.length; i++) {
    // save a local copy for easier reference
    sqsProspect = sqsProspects[i];

    // validate all necessary data points are present
    if (hasValidStructure(sqsProspect)) {
      // if the prospect has a valid structure, validate the property values
      // for each invalid property, an error message will be added to the
      // `errors` array
      errors = validateProperties(sqsProspect);
    } else {
      errors.push('prospect is missing one or more properties.');
    }

    // if there are no errors, we are good to delete old prospects and insert
    // the new ones
    if (!errors.length) {
      // convert Sqs formatted data to our standard format
      prospect = convertSqsProspectToProspect(sqsProspect);

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
      console.log(`Getting url metadata for ${prospect.url}`);
      const urlMetadata = await deriveUrlMetadata(prospect.url);
      console.log(`Got url metadata for ${prospect.url}`);

      prospect = hydrateProspectMetadata(prospect, urlMetadata);

      await insertProspect(dbClient, prospect);

      // TODO: should we keep this in prod? matt cooper was unaware this was
      // happening, so it may be good to keep a record. we don't need to error
      // here - dynamo will silently replace the existing entry.
      if (idsProcessed.includes(prospect.id)) {
        Sentry.captureMessage(
          `${prospect.id} is a duplicate in this ${prospect.scheduledSurfaceGuid} / ${prospect.prospectType} batch!`,
        );
      }

      idsProcessed.push(prospect.id);

      prospectsProcessed++;
    } else {
      console.log('FAILED PARSING PROSPECT');
      console.log(`prospect: ${JSON.stringify(sqsProspect)}`);
      console.log(`errors: ${errors}`);

      Sentry.captureException(errors.join(' | '));

      prospectsErrored++;
    }

    // reset errors array for next loop iteration
    errors = [];
  }

  console.log(`${prospectsProcessed} prospects inserted into dynamo.`);
  console.log(`${prospectsErrored} prospects had errors.`);
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
