import {
  getAllSnowplowEvents,
  resetSnowplowEvents,
  prospect,
} from './snowplow-test-helpers';
import { getEmitter, getTracker, queueSnowplowEvent } from './snowplow';
import { SnowplowProspect } from './types';

describe('snowplow', () => {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should accept an event with a prospect', async () => {
    const emitter = getEmitter();
    const tracker = getTracker(emitter);

    queueSnowplowEvent(tracker, 'prospect_reviewed', prospect);

    // wait a sec * 3 because snowplow does internal queueing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const allEvents = await getAllSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with status reasons and no comment', async () => {
    const emitter = getEmitter();
    const tracker = getTracker(emitter);

    const prospectWithRemovalReasons: SnowplowProspect = {
      ...prospect,
      status_reasons: ['PUBLISHER_DIVERSITY', 'TIME_SENSITIVE'],
    };

    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      prospectWithRemovalReasons,
    );

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const allEvents = await getAllSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with no status reasons and a comment', async () => {
    const emitter = getEmitter();
    const tracker = getTracker(emitter);

    const prospectWithRemovalReasons: SnowplowProspect = {
      ...prospect,
      status_reason_comment: 'do read these comments',
    };

    queueSnowplowEvent(
      tracker,
      'prospect_reviewed',
      prospectWithRemovalReasons,
    );

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const allEvents = await getAllSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  it('should accept an event with a prospect with status reasons and comment', async () => {
    const emitter = getEmitter();
    const tracker = getTracker(emitter);

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

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const allEvents = await getAllSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });
});
