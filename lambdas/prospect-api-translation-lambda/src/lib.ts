import * as Sentry from '@sentry/serverless';
import { SQSEvent } from 'aws-lambda';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import {
  dbClient,
  deriveUrlMetadata,
  insertProspect,
  Prospect,
  ScheduledSurfaces,
} from 'prospectapi-common';

import {
  applyApTitleCase,
  applyCurlyQuotes,
  CorpusLanguage,
  Topics,
  UrlMetadata,
} from 'content-common';

import { SqsProspect } from './types';

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

export const processProspect = async (
  prospect: Prospect,
  idsProcessed: string[],
): Promise<string[]> => {
  const urlMetadata = await deriveUrlMetadata(prospect.url);

  prospect = hydrateProspectMetadata(prospect, urlMetadata);

  await insertProspect(dbClient, prospect);

  // an edge case we've hit before - ML was sending duplicate prospects in a
  // single batch. we don't need to error here - dynamo will silently replace
  // the existing entry. logging seems like the best approach for now.
  if (idsProcessed.includes(prospect.id)) {
    console.log(
      `${prospect.id} is a duplicate in this ${prospect.scheduledSurfaceGuid} / ${prospect.prospectType} batch!`,
    );
  }

  idsProcessed.push(prospect.id);

  return idsProcessed;
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
  } catch (_) {
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

export const convertSqsProspectToProspect = (
  sqsProspect: SqsProspect,
): Prospect => {
  return {
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
  // check if candidate is EN language to (not) apply title formatting
  const isCandidateEnglish =
    urlMetadata.language?.toUpperCase() === CorpusLanguage.EN;
  const title = isCandidateEnglish
    ? (applyApTitleCase(urlMetadata.title) as string)
    : urlMetadata.title;
  const excerpt = applyCurlyQuotes(urlMetadata.excerpt) as string;
  // Mutating the function argument here to avoid creating
  // more objects and be memory efficient

  // While the the urlMetaData and prospect fields match currently,
  // they're not guaranteed to be the same in the future hence we're
  // directly assigning them

  // NOTE: individual url metadata fields might be undefined
  prospect.domain = urlMetadata.domain;
  prospect.excerpt = excerpt;
  prospect.imageUrl = urlMetadata.imageUrl;
  prospect.isCollection = urlMetadata.isCollection;
  prospect.isSyndicated = urlMetadata.isSyndicated;
  prospect.language = urlMetadata.language;
  prospect.publisher = urlMetadata.publisher;
  prospect.title = title;
  prospect.authors = urlMetadata.authors;

  return prospect;
};
