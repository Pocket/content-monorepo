import {resetSnowplowEvents, waitForSnowplowEvents,} from 'content-common/snowplow/test-helpers';
import {getEmitter, getTracker} from 'content-common/snowplow';
import {queueSnowplowEvent} from './snowplow';
import {SnowplowProspect,} from './types';
import config from '../config';
import {ProspectReviewStatus} from 'content-common';

describe('snowplow', () => {
    const mockCandidate: SnowplowProspect = {
        object_version: 'new',
        prospect_id: '1abc',
        prospect_source: 'COUNTS',
        scheduled_surface_id: 'NEW_TAB_EN_US',
        prospect_review_status: ProspectReviewStatus.Created,
        url: 'https://fake-prospect.com',
        // unix timestamp
        created_at: Date.now(),
        features: {
            data_source: 'prospect',
            rank: 28,
            save_count: 29,
            predicted_topic: 'TECHNOLOGY',
        },
        run_details: {
            candidate_set_id: 'abc1',
            // unix timestamp
            expires_at: 1716488367,
            flow: 'GlobalProspectsFlow',
            run_id: 'sfn-05612f'
        }
    };
    const emitter = getEmitter();
    const tracker = getTracker(emitter, config.snowplow.appId);

    beforeEach(async () => {
        await resetSnowplowEvents();
    });

    it('should accept an event with a created prospect', async () => {
        queueSnowplowEvent(tracker, mockCandidate);

        const allEvents = await waitForSnowplowEvents();

        expect(allEvents.total).toEqual(1);
        expect(allEvents.bad).toEqual(0);
    });
    it('should accept an event with a created prospect and with no run details present', async () => {
        const candidate: SnowplowProspect = {
            object_version: 'new',
            prospect_id: '1abc',
            prospect_source: 'COUNTS',
            scheduled_surface_id: 'NEW_TAB_EN_US',
            prospect_review_status: ProspectReviewStatus.Created,
            url: 'https://fake-prospect.com',
            // unix timestamp
            created_at: Date.now(),
            features: {
                data_source: 'prospect',
                rank: 28,
                save_count: 29,
                predicted_topic: 'TECHNOLOGY',
            }
        };
        queueSnowplowEvent(tracker, candidate);

        const allEvents = await waitForSnowplowEvents();

        expect(allEvents.total).toEqual(1);
        expect(allEvents.bad).toEqual(0);
    });
});
