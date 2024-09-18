import {
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common/snowplow/test-helpers';
import { getEmitter, getTracker } from 'content-common/snowplow';
import { queueSnowplowEvent } from './snowplow';
import config from '../config';
import { ProspectReviewStatus, SnowplowProspect } from 'content-common';

describe('snowplow', () => {
  const mockCandidate: SnowplowProspect = {
    object_version: 'new',
    prospect_id: 'c586eff4-f69a-5e5b-8c4d-a4039bb5b497',
    url: 'https://www.nytimes.com/2022/11/03/t-magazine/spain-islamic-history.html',
    title: 'In Search of a Lost Spain',
    excerpt:
      'ON A MORNING of haunting heat in Seville, I sought out the tomb of Ferdinand III. There, in the Gothic cool, older Spaniards came and went, dropping to one knee and crossing themselves before the sepulcher of the Castilian monarch.',
    image_url:
      'https://static01.nyt.com/images/2022/11/03/t-magazine/03tmag-spain-slide-9VKO-copy/03tmag-spain-slide-9VKO-facebookJumbo.jpg',
    language: 'en',
    topic: 'EDUCATION',
    is_collection: false,
    is_syndicated: false,
    authors: ['RICHARD MOSSE', 'AATISH TASEER'],
    publisher: 'The New York Times',
    domain: 'nytimes.com',
    prospect_source: 'COUNTS_LOGISTIC_APPROVAL',
    scheduled_surface_id: 'NEW_TAB_EN_US',
    prospect_review_status: ProspectReviewStatus.Created,
    created_at: 1668100357,
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
      run_id: 'sfn-05612f',
    },
  };
  const emitter = getEmitter();
  const tracker = getTracker(emitter, config.snowplow.appId);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should accept an event with a created prospect', async () => {
    queueSnowplowEvent(tracker, mockCandidate);

    const allEvents = await waitForSnowplowEvents(1);

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });
  it('should accept an event with a created prospect and with no run details present', async () => {
    const candidate: SnowplowProspect = {
      ...mockCandidate,
      run_details: undefined,
    };

    queueSnowplowEvent(tracker, candidate);

    const allEvents = await waitForSnowplowEvents(1);

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });
});
