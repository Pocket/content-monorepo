import { ProspectReviewStatus } from 'content-common';
import { ProspectFeatures, ProspectRunDetails } from '../types';

export type SnowplowProspect = {
    object_version: 'new' | 'old';
    prospect_id: string;
    prospect_source: string;
    scheduled_surface_id: string;
    prospect_review_status: ProspectReviewStatus;
    url: string;
    // unix timestamp
    created_at: number;
    features?: ProspectFeatures;
    run_details?: ProspectRunDetails;
}