import {
  buildSelfDescribingEvent,
  SelfDescribingEvent,
  SelfDescribingJson,
  Tracker,
} from '@snowplow/node-tracker';
import {
  SnowplowProspect,
  ProspectFeatures,
  ProspectRunDetails,
} from 'content-common';
import config from '../config';
import { ProspectReviewStatus } from 'content-common';
import { Prospect } from 'prospectapi-common';

/**
 * creates an object_update Snowplow event for prospect
 *
 * @returns SelfDescribingEvent
 */
export const generateEvent = (): SelfDescribingEvent => {
  return {
    event: {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: 'prospect_created',
        object: 'prospect',
      },
    },
  };
};

/**
 * generates a created prospect entity being sent to snowplow
 *
 * @param prospect ML Prospect
 * @returns SelfDescribingJson
 */
export const generateContext = (
  prospect: SnowplowProspect,
): SelfDescribingJson => {
  return {
    schema: config.snowplow.schemas.prospect,
    data: prospect,
  };
};

/**
 *
 * @param prospect ML prospect
 * @param prospectSource
 * @param runDetails
 * @param features
 */
export const generateSnowplowEntity = (
  prospect: Prospect,
  prospectSource: string,
  runDetails: ProspectRunDetails,
  features: ProspectFeatures,
): SnowplowProspect => {
  return {
    object_version: 'new',
    prospect_id: prospect.prospectId,
    prospect_source: prospectSource,
    scheduled_surface_id: prospect.scheduledSurfaceGuid,
    url: prospect.url,
    title: prospect.title,
    excerpt: prospect.excerpt,
    image_url: prospect.imageUrl,
    language: prospect.language,
    topic: prospect.topic,
    is_collection: prospect.isCollection,
    is_syndicated: prospect.isSyndicated,
    authors: prospect.authors?.split(','),
    publisher: prospect.publisher,
    domain: prospect.domain,
    created_at: prospect.createdAt || Math.round(Date.now() / 1000), // date in seconds (snowplow expects integer & not number)
    prospect_review_status: ProspectReviewStatus.Created,
    features: {
      data_source: features.data_source,
      rank: features.rank,
      save_count: features.save_count,
      predicted_topic: features.predicted_topic,
    },
    run_details: {
      candidate_set_id: runDetails.candidate_set_id,
      expires_at: runDetails.expires_at,
      flow: runDetails.flow,
      run_id: runDetails.run_id,
    },
  };
};

/**
 * main entry point to snowplow. queues up an event to send.
 *
 * (elsewhere, we tell snowplow to send all queued events.)
 *
 * @param tracker TrackerInterface
 * @param entity Entity representing the result of creating a prospect.
 */
export const queueSnowplowEvent = (
  tracker: Tracker,
  entity: SnowplowProspect,
) => {
  const event = generateEvent();
  const contexts: SelfDescribingJson[] = [generateContext(entity)];

  // reminder - this method is not async and does not directly initiate
  // any http request. it sends the event to a queue internal to the
  // snowplow module, which has its own logic on when to flush the queue.
  tracker.track(buildSelfDescribingEvent(event), contexts);
};
