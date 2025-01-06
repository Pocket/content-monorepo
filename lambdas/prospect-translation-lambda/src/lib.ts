import * as Sentry from '@sentry/serverless';
import { SQSEvent } from 'aws-lambda';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import {
  dbClient,
  deriveDomainName,
  deriveUrlMetadata,
  insertProspect,
  Prospect,
  ScheduledSurfaces,
} from 'prospectapi-common';

import {
  applyApTitleCase,
  formatQuotesEN,
  formatQuotesDashesDE,
  CorpusLanguage,
  Topics,
  ProspectFeatures,
  ProspectRunDetails,
  UrlMetadata,
} from 'content-common';

import { SqsProspect, ProspectTypesWithMlUrlMetadata } from './types';
import { generateSnowplowEntity, queueSnowplowEvent } from './events/snowplow';
import { Tracker } from '@snowplow/node-tracker';

/**
 * verifies the event coming from SQS can be parsed as JSON
 * @param event SQSEvent
 * @returns json object
 */
export const parseJsonFromEvent = (event: SQSEvent): any => {
  let json: any;

  // is the SQS message valid JSON?
  try {
    // this is the (odd?) format of an SQS message
    json = JSON.parse(event.Records[0].body);

    // we encountered some weird SQS behavior where multiple prospect messages
    // were coming in. this was during an aws incident so may have been a fluke
    // but - let's log to sentry if this happens again just in case.
    if (event.Records.length > 1) {
      Sentry.addBreadcrumb({ message: 'parseJsonFromEvent', data: event });
      Sentry.captureException('multiple records found in SQS message');
    }
  } catch (e) {
    Sentry.addBreadcrumb({
      message: 'parseJsonFromEvent',
      data: {
        event,
        error: e,
      },
    });
    Sentry.captureException(
      'invalid data provided / sqs event.Records[0].body is not valid JSON.',
    );

    json = {};
  }

  return json;
};

/**
 * retrieves prospects from the sqs message
 *
 * @param messageBodyJson JSON in the `body` property of the sqs message
 * @returns either the array of prospects in the JSON or an empty array
 */
export const getProspectsFromMessageJson = (
  messageBodyJson: any,
): { [key: string]: any }[] => {
  if (
    messageBodyJson.detail?.candidates &&
    Array.isArray(messageBodyJson.detail.candidates)
  ) {
    return messageBodyJson.detail.candidates;
  } else {
    Sentry.addBreadcrumb({
      message: 'getProspectsFromMessageJson',
      data: messageBodyJson,
    });

    Sentry.captureException(
      'no `candidates` property exists on the SQS JSON, or `candidates` is not an array.',
    );

    return [];
  }
};

/**
 * retrieves prospect run details from the sqs message
 *
 * @param messageBodyJson JSON in the `body` property of the sqs message
 * @returns either SqsProspectRunDetails obj in the JSON or an empty SqsProspectRunDetails
 */
export const getProspectRunDetailsFromMessageJson = (
  messageBodyJson: any,
): ProspectRunDetails => {
  const runDetails = {};
  if (messageBodyJson.detail) {
    if (messageBodyJson.detail.id) {
      runDetails['candidate_set_id'] = messageBodyJson.detail.id;
    }
    if (messageBodyJson.detail.flow) {
      runDetails['flow'] = messageBodyJson.detail.flow;
    }
    if (messageBodyJson.detail.run) {
      runDetails['run_id'] = messageBodyJson.detail.run;
    }
    if (messageBodyJson.detail.expires_at) {
      runDetails['expires_at'] = messageBodyJson.detail.expires_at;
    }
    return runDetails as ProspectRunDetails;
  } else {
    Sentry.addBreadcrumb({
      message: 'getProspectRunDetailsFromMessageJson',
      data: messageBodyJson,
    });

    Sentry.captureException('no `detail` property exists on the SQS JSON.');

    return runDetails as ProspectRunDetails;
  }
};

/**
 * retrieves URL metadata from the Parser to hydrate the prospect.
 * inserts the prospect into dynamo and sends snowplow event.
 *
 * @param prospect a Prospect object with partially hydrated data
 * @param runDetails the ML run details, sent to snowplow
 * @param features the ML prospect features, sent to snowplow
 * @param tracker the snowplow Tracker
 * @returns Promise<void>
 */
export const processProspect = async (
  prospect: Prospect,
  runDetails: ProspectRunDetails,
  features: ProspectFeatures,
  tracker: Tracker,
): Promise<void> => {
  // get URL metadata from the Parser
  const urlMetadata = await deriveUrlMetadata(prospect.url);

  // hydrate necessary URL metadata
  prospect = hydrateProspectMetadata(prospect, urlMetadata);

  // insert the prospect into dynamodb
  await insertProspect(dbClient, prospect);

  // Finally, Send a Snowplow event after the prospect got successfully created in dynamo.
  queueSnowplowEvent(
    tracker,
    generateSnowplowEntity(prospect, runDetails, features),
  );
};

/**
 * ensures prospect conforms to the interface
 *
 * @param rawSqsProspect an object from an SQS message
 * @returns boolean
 */
export const validateStructure = (
  rawSqsProspect: unknown,
): rawSqsProspect is SqsProspect => {
  if (
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'prospect_id') &&
    Object.prototype.hasOwnProperty.call(
      rawSqsProspect,
      'scheduled_surface_guid',
    ) &&
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'predicted_topic') &&
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'prospect_source') &&
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'url') &&
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'save_count') &&
    Object.prototype.hasOwnProperty.call(rawSqsProspect, 'rank')
  ) {
    return true;
  } else {
    Sentry.addBreadcrumb({
      message: 'hasValidStructure',
      data: rawSqsProspect,
    });
    Sentry.captureException('prospect does not have a valid structure');

    return false;
  }
};

/**
 * ensure the `prospect_id` is a string
 * @param sqsProspect a structurally valid prospect from sqs
 * @returns boolean
 */
export const hasValidProspectId = (sqsProspect: SqsProspect): boolean => {
  return typeof sqsProspect.prospect_id === 'string';
};

/**
 * ensure the `scheduled_surface_guid` is one of our pre-defined values
 *
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidScheduledSurfaceGuid = (
  sqsProspect: SqsProspect,
): boolean => {
  let valid = false;

  for (let i = 0; i < ScheduledSurfaces.length; i++) {
    if (
      typeof sqsProspect.scheduled_surface_guid === 'string' &&
      ScheduledSurfaces[i].guid === sqsProspect.scheduled_surface_guid
    ) {
      valid = true;
      break;
    }
  }

  return valid;
};

/**
 * ensure the `predicted_topic` is one of our pre-defined values or an empty string
 *
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidPredictedTopic = (sqsProspect: SqsProspect): boolean => {
  const prospectPredictedTopic = sqsProspect?.predicted_topic;
  return prospectPredictedTopic
    ? Object.values(Topics).includes(prospectPredictedTopic as any)
    : prospectPredictedTopic === '';
};

/**
 * ensure the save_count is numeric
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidSaveCount = (sqsProspect: SqsProspect): boolean => {
  return typeof sqsProspect.save_count === 'number';
};

/**
 * ensure the rank is numeric
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidRank = (sqsProspect: SqsProspect): boolean => {
  return typeof sqsProspect.rank === 'number';
};

/**
 * ensure the prospect type is valid for the given feed id
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidProspectSource = (sqsProspect: SqsProspect): boolean => {
  let isValid = false;

  for (let i = 0; i < ScheduledSurfaces.length; i++) {
    // make sure the feed id is valid
    if (
      typeof sqsProspect.scheduled_surface_guid === 'string' &&
      ScheduledSurfaces[i].guid === sqsProspect.scheduled_surface_guid
    ) {
      // make sure the prospect type is valid for the feed id
      isValid = ScheduledSurfaces[i].prospectTypes.includes(
        // we'll allow lowercase values. i guess.
        sqsProspect.prospect_source.toUpperCase() as any,
      );
      break;
    }
  }

  return isValid;
};

/**
 * ensure the url is valid and begins with http or https
 * @param sqsProspect a structurally valid prospect
 * @returns boolean
 */
export const hasValidUrl = (sqsProspect: SqsProspect): boolean => {
  // https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
  let url;

  try {
    url = new URL(sqsProspect.url);
  } catch {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
};

/**
 * a helper function to return useful error messages while validating a
 * prospect's properties
 * @param sqsProspect Prospect
 * @returns array of error messages
 */
export const validateProperties = (sqsProspect: SqsProspect): boolean => {
  const errors: string[] = [];

  if (!hasValidProspectId(sqsProspect)) {
    errors.push(`prospect_id '${sqsProspect.prospect_id} is not valid.`);
  }

  if (!hasValidScheduledSurfaceGuid(sqsProspect)) {
    errors.push(
      `feed_name '${sqsProspect.scheduled_surface_guid} is not valid.`,
    );
  }

  if (!hasValidPredictedTopic(sqsProspect)) {
    errors.push(
      `predicted_topic '${sqsProspect.predicted_topic}' is not valid.`,
    );
  }

  if (!hasValidSaveCount(sqsProspect)) {
    errors.push(`save_count '${sqsProspect.save_count}' is not numeric.`);
  }

  if (!hasValidRank(sqsProspect)) {
    errors.push(`rank '${sqsProspect.rank}' is not numeric.`);
  }

  if (!hasValidProspectSource(sqsProspect)) {
    errors.push(
      `prospect_type '${sqsProspect.prospect_source}' is invalid for the feed_name '${sqsProspect.scheduled_surface_guid}'.`,
    );
  }

  if (!hasValidUrl(sqsProspect)) {
    errors.push(`url '${sqsProspect.url} is not valid.`);
  }

  if (!errors.length) {
    return true;
  } else {
    Sentry.addBreadcrumb({
      message: 'validateProperties',
      data: {
        sqsProspect,
        errors,
      },
    });

    Sentry.captureException('sqsProspect has invalid properties');

    return false;
  }
};

/**
 * takes a raw prospect from SQS and converts it to a Prospect object as
 * expecte by DynamoDB
 *
 * @param sqsProspect raw prospect object from SQS
 * @returns Prospect object
 */
export const convertSqsProspectToProspect = (
  sqsProspect: SqsProspect,
): Prospect => {
  let prospect: Prospect = {
    id: uuidv4(),
    prospectId: sqsProspect.prospect_id,
    // make sure this matches our ALL CAPS guid value
    scheduledSurfaceGuid: sqsProspect.scheduled_surface_guid.toUpperCase(),
    prospectType: sqsProspect.prospect_source as any,
    url: sqsProspect.url,
    topic: sqsProspect.predicted_topic as any,
    saveCount: sqsProspect.save_count,
    rank: sqsProspect.rank,
  };

  // 2024-12-12
  // some prospects will have ML-supplied URL metadata. this is currently
  // experimental to validate metadata from ML, so we want to capture any
  // issues in Sentry, but not block processing to ensure editors see the
  // missing pieces of data.
  if (ProspectTypesWithMlUrlMetadata.includes(prospect.prospectType)) {
    try {
      prospect.authors = sqsProspect.authors.join(',');
    } catch {
      Sentry.captureException(
        `Invalid ML supplied value for 'authors': ${sqsProspect.authors}`,
      );
    }

    try {
      prospect.excerpt = sqsProspect.excerpt.toString();
    } catch {
      Sentry.captureException(
        `Invalid ML supplied value for 'excerpt': ${sqsProspect.excerpt}`,
      );
    }

    try {
      prospect.imageUrl = sqsProspect.image_url.toString();
    } catch {
      Sentry.captureException(
        `Invalid ML supplied value for 'image_url': ${sqsProspect.image_url}`,
      );
    }

    try {
      prospect.title = sqsProspect.title.toString();
    } catch {
      Sentry.captureException(
        `Invalid ML supplied value for 'title': ${sqsProspect.title}`,
      );
    }

    // language must map to our enum - if it doesn't, skip setting this property
    if (
      sqsProspect.language &&
      sqsProspect.language.toUpperCase() in CorpusLanguage
    ) {
      prospect.language = sqsProspect.language.toUpperCase();
    } else {
      Sentry.captureException(
        `Invalid ML supplied value for 'language': ${sqsProspect.language}`,
      );
    }
  }

  return prospect;
};

/**
 * Populates a Prospect based off parser url meta data
 *
 * @param prospect a Prospect object from dynamo
 * @param urlMetadata meta data from the parser
 * @returns a Prospect object with metadata added
 */
export const hydrateProspectMetadata = (
  prospect: Prospect,
  urlMetadata: UrlMetadata,
): Prospect => {
  // while we are moving towards ML-supplied metadata, the Parser must still
  // give us the publisher name.
  // (from the legacy MySQL `readitla_b.domain_business_metadata` table)
  prospect.publisher = urlMetadata.publisher;

  // ML is no longer sending syndicated/collections as prospects
  prospect.isCollection = false;
  prospect.isSyndicated = false;

  if (ProspectTypesWithMlUrlMetadata.includes(prospect.prospectType)) {
    // URL metadata was supplied by ML and assigned in
    // `convertSqsProspectToProspect` above. we specifically do *not* want to
    // fall-back to Parser metadata in this scenario, as we want to know if
    // any data is missing from ML.

    // `deriveDomainName` is the same method used under the hood in
    // `deriveUrlMetadata` - calling directly here to clarify no Parser use.
    prospect.domain = deriveDomainName(prospect.url);
  } else {
    // URL metadata *not* supplied by ML, so use the Parser
    // NOTE: urlMetadata fields might be undefined/empty
    prospect.authors = urlMetadata.authors;
    prospect.domain = urlMetadata.domain;
    prospect.excerpt = urlMetadata.excerpt;
    prospect.imageUrl = urlMetadata.imageUrl;
    prospect.language = urlMetadata.language;
    prospect.title = urlMetadata.title;
  }

  // apply title/excerpt formatting for EN & DE
  if (prospect.language?.toUpperCase() === CorpusLanguage.EN) {
    prospect.title = formatQuotesEN(applyApTitleCase(prospect.title)) as string;
    prospect.excerpt = formatQuotesEN(prospect.excerpt) as string;
  } else if (prospect.language?.toUpperCase() === CorpusLanguage.DE) {
    prospect.title = formatQuotesDashesDE(prospect.title) as string;
    prospect.excerpt = formatQuotesDashesDE(prospect.excerpt) as string;
  }

  return prospect;
};
