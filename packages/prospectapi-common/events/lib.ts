import { Prospect } from '../types';
import { ProspectReviewStatus, SnowplowProspect } from './types';

/**
 * converts a Prospect into its snowplow equivalent
 *
 * @param prospect a Prospect object
 * @returns a SnowplowProspect object
 */
export const prospectToSnowplowProspect = (
  prospect: Prospect,
  authUserName?: string,
  statusReasons?: string[],
  statusReasonComment?: string,
): SnowplowProspect => {
  const snowplowProspect: SnowplowProspect = {
    object_version: 'new',
    prospect_id: prospect.prospectId,
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
    prospect_source: prospect.prospectType,
    scheduled_surface_id: prospect.scheduledSurfaceGuid,
    // not sure how a prospect could be missing a `createdAt` value...
    created_at: prospect.createdAt || Date.now(),
    prospect_review_status: ProspectReviewStatus.Dismissed,
    reviewed_at: Date.now(),
    reviewed_by: authUserName,
  };

  // snowplow will not accept null values for the below
  if (statusReasons) {
    snowplowProspect.status_reasons = statusReasons;
  }

  if (statusReasonComment) {
    snowplowProspect.status_reason_comment = statusReasonComment;
  }

  return snowplowProspect;
};
