import {
  waitForSnowplowEvents,
  resetSnowplowEvents,
  getEmitter,
  getTracker,
  SnowplowProspect,
  ProspectReviewStatus,
} from 'content-common';
import { queueSnowplowEvent } from './snowplow';
import config from '../config';

const generateProspect = (title: string): SnowplowProspect => {
  return {
    object_version: 'new',
    prospect_id: 'c586eff4-f69a-5e5b-8c4d-a4039bb5b497',
    url: 'https://www.nytimes.com/2022/11/03/t-magazine/spain-islamic-history.html',
    title,
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
    // The Unix timestamp in seconds.
    created_at: 1668100357,
    prospect_review_status: ProspectReviewStatus.Dismissed,
    // The Unix timestamp in milliseconds.
    reviewed_at: 1668110696000,
    // The LDAP string of the curator who reviewed this prospect - for now, only dismissing prospect.
    reviewed_by: 'sso-user',
  };
};

describe('snowplow', () => {
  const emitter = getEmitter(() => {});
  const tracker = getTracker(emitter, config.snowplow.appId);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should accept an event with a prospect', async () => {
    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      generateProspect('should accept an event with a prospect'),
    );

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with status reasons and no comment', async () => {
    const prospect = generateProspect(
      'should accept an event with a prospect with status reasons and no comment',
    );

    const prospectWithRemovalReasons: SnowplowProspect = {
      ...prospect,
      status_reasons: ['PUBLISHER_DIVERSITY', 'TIME_SENSITIVE'],
    };

    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      prospectWithRemovalReasons,
    );

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with no status reasons and a comment', async () => {
    const prospect = generateProspect(
      'should accept an event with a prospect with no status reasons and a comment',
    );

    const prospectWithRemovalReasons: SnowplowProspect = {
      ...prospect,
      status_reason_comment: 'do read these comments',
    };

    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      prospectWithRemovalReasons,
    );

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with status reasons and comment', async () => {
    const prospect = generateProspect(
      'should accept an event with a prospect with status reasons and comment',
    );

    const prospectWithRemovalReasons: SnowplowProspect = {
      ...prospect,
      status_reasons: ['PUBLISHER_DIVERSITY', 'TIME_SENSITIVE'],
      status_reason_comment: 'publisher spread too thin and old content',
    };

    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      prospectWithRemovalReasons,
    );

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });
});
