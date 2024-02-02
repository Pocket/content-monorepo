import * as Sentry from '@sentry/node';
import { cloneDeep } from 'lodash';

import {
  Prospect,
  ScheduledSurface,
  ScheduledSurfaces,
} from 'prospectapi-common';

import config from './config';
import { CorpusLanguage, SortedRankedProspects } from './types';
import {
  ProspectReviewStatus,
  SnowplowProspect,
} from 'prospectapi-common/events/types';

/**
 * checks the given new tab GUID to make sure it's valid
 *
 * @param guid string scheduled surface GUID provided by clients when querying
 * @returns ScheduledSurface if valid GUID, undefined if not
 */
export const getScheduledSurfaceByGuid = (
  guid: string,
): ScheduledSurface | undefined => {
  return ScheduledSurfaces.find(
    (surface: ScheduledSurface) => surface.guid === guid,
  );
};

/**
 * checks the given prospect type is valid based on the new tab GUID
 * (each new tab has a subset of prospect types that are valid)
 *
 * @param scheduledSurfaceGuid string new tab GUID provided by clients when querying
 * @param prospectType string prospect type provided by clients
 * @returns boolean
 */
export const isValidProspectType = (
  scheduledSurfaceGuid: string,
  prospectType: string,
): boolean => {
  // get the new tab (already validated using the above function)
  const scheduledSurface: ScheduledSurface = ScheduledSurfaces.filter(
    (scheduledSurface) => {
      return scheduledSurface.guid === scheduledSurfaceGuid;
    },
  )[0];

  let isValid = false;

  // make sure the prospect type is associated with the new tab
  scheduledSurface.prospectTypes.forEach((pt) => {
    if (pt === prospectType) {
      isValid = true;
    }
  });

  return isValid;
};

/**
 *
 * @param prospects an array of prospects from dynamodb
 * @returns an object with keys matching available prospect types, each key
 *  containing an array of prospects matching that prospect type sorted by
 *  rank, ascending
 */
export const getSortedRankedProspects = (
  prospects: Prospect[],
): SortedRankedProspects => {
  // get all unique prospectTypes from `prospects` - this will be our random choice
  const availableProspectTypes: string[] = [];

  prospects.forEach((prospect) => {
    if (!availableProspectTypes.includes(prospect.prospectType)) {
      availableProspectTypes.push(prospect.prospectType);
    }
  });

  // break up `prospects` into smaller arrays by prospectType
  const sortedProspects: SortedRankedProspects = {};

  // add an object key for each prospect type pointing to an empty prospect
  availableProspectTypes.forEach((val) => {
    sortedProspects[val] = [];
  });

  // put prospects into prospect type arrays
  prospects.forEach((p) => {
    sortedProspects[p.prospectType].push(p);
  });

  // for each smaller array, sort by rank (descending) because we need to pop from the array
  availableProspectTypes.forEach((val) => {
    sortedProspects[val].sort((a: Prospect, b: Prospect) => {
      return b.rank - a.rank;
    });
  });

  return sortedProspects;
};

/**
 *
 * @param sortedProspects
 * @returns An array of max 20 randomized prospects where each prospect is the next highest
 * ranked for its prospect type
 */
export const getRandomizedSortedRankedProspects = (
  sortedProspects: SortedRankedProspects,
): Prospect[] => {
  // deep cloning the method parameter to avoid mutating it
  const sortedProspectsClone = cloneDeep(sortedProspects);

  // pull out the prospect types from the sorted prospects
  const prospectTypes = Object.keys(sortedProspectsClone);
  // get the total number of prospects for all prospect types
  const totalSortedProspects =
    Object.values(sortedProspectsClone).flat().length;

  let randomProspectType: string;
  let highestRankedProspectForProspectType: Prospect | undefined;
  let randomIdx: number;
  let prospectsProcessed = 0;

  // if the total number of prospects is less than the config prospectBatchSize, use it as the batch size
  const batchSize =
    totalSortedProspects < config.app.prospectBatchSize
      ? totalSortedProspects
      : config.app.prospectBatchSize;

  const result: Prospect[] = [];

  // keep going until we've processed all prospects
  while (prospectsProcessed != batchSize) {
    randomIdx = Math.floor(Math.random() * prospectTypes.length);

    // get a random prospect type
    randomProspectType = prospectTypes[randomIdx];

    // get the highest(lower number = higher rank) ranked prospect for a random prospect type
    // since each prospect type has its prospects sorted in descending order, pop() gets us the last element which is the highest ranked
    highestRankedProspectForProspectType =
      sortedProspectsClone[randomProspectType].pop();

    // if the chosen prospect type is now empty, remove it from our available choices
    if (sortedProspects[randomProspectType].length === 0) {
      // remove the prospect type which has no prospects left
      prospectTypes.splice(randomIdx, 1);
    }

    // push to our result array
    if (highestRankedProspectForProspectType) {
      result.push(highestRankedProspectForProspectType);
      prospectsProcessed++;
    }
  }

  // Log a message to sentry if we get prospects fewer than default batch size
  batchSize < config.app.prospectBatchSize &&
    Sentry.captureMessage(
      `Found prospects fewer than default batch size: ${batchSize}`,
    );

  return result;
};

/**
 * ensure we send either a valid CorpusLanguage enum or undefined to clients
 *
 * @param language string value returned from the parser
 * @returns either a CorpusLanguage enum or undefined
 */
export const standardizeLanguage = (
  language?: string,
): CorpusLanguage | undefined => {
  return language ? CorpusLanguage[language.toUpperCase()] : undefined;
};

/**
 *
 * @param prospects an array of prospects
 * @returns prospects sorted by their rank in ascending order
 */
export const getProspectsSortedByAscendingRank = (
  prospects: Prospect[],
): Prospect[] => {
  return prospects.sort((a: Prospect, b: Prospect) => {
    return a.rank - b.rank;
  });
};

/**
 * helper to find and log to Sentry the true duplicate prospects in an array of prospects
 * a true duplicate means having the same id, prospectType and scheduledSurfaceGuid combo
 *
 * @param prospects
 */
export const findAndLogTrueDuplicateProspects = (
  prospects: Prospect[],
): void => {
  const trueDuplicateProspects: Prospect[] = [];
  const duplicateProspectProps = new Set();

  for (const prospect of prospects) {
    const dupeProps = JSON.stringify({
      id: prospect.id,
      prospectType: prospect.prospectType,
      scheduledSurfaceGuid: prospect.scheduledSurfaceGuid,
    });

    if (duplicateProspectProps.has(dupeProps)) {
      trueDuplicateProspects.push(prospect);
    }

    duplicateProspectProps.add(dupeProps);
  }

  if (trueDuplicateProspects.length > 0) {
    Sentry.captureMessage(
      `True duplicate prospects found: ${[...trueDuplicateProspects]}`,
    );
  }
};

/**
 * helper to de-duplicate prospects based on url. Logs to Sentry with list of duplicate urls
 *
 * @param prospects
 * @returns deDupedProspects
 */
export const deDuplicateProspectUrls = (prospects: Prospect[]): Prospect[] => {
  const duplicateUrls = new Set<string>();
  const prospectUrlSet = new Set();
  const deDupedProspects: Prospect[] = [];

  for (const prospect of prospects) {
    if (!prospectUrlSet.has(prospect.url)) {
      deDupedProspects.push(prospect);
    } else {
      duplicateUrls.add(prospect.url);
    }

    prospectUrlSet.add(prospect.url);
  }

  return deDupedProspects;
};

/**
 * takes a comma separated string and returns an array of strings
 * @param reasonCsv a string of comma separated values or null
 * @returns a string array
 */
export const parseReasonsCsv = (reasonCsv: string | null): string[] => {
  // if a csv of reasons was provided, split the comma separated string of
  // reasons into an array
  let reasons: string[] = [];

  if (reasonCsv) {
    reasons = reasonCsv.split(',').map((reason) => {
      // TODO: once reasons are finalized, is it worth validating them against an enum here?
      // for now, just sanitize to be safe
      const sanitized = sanitizeText(reason, config.app.removeReasonMaxLength);

      if (sanitized.length > 0) {
        return sanitized;
      }
    });
  }

  return reasons;
};

/**
 * basic text sanitization function for cleaning free text entered by curators
 * @param input unsanitized string
 * @returns sanitized string
 */
export const sanitizeText = (input: string, maxLength: number): string => {
  // remove all non-allowed characters and buffering whitespace
  let sanitized = input.replace(/[^a-zA-Z0-9 \-.!?]/g, '').trim();

  // collapse more than one consecutive space into a single space
  sanitized = sanitized.replace(/  +/g, ' ');

  // trim to conform to our max length
  return sanitized.substring(0, maxLength - 1);
};
