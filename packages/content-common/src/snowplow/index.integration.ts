import { getEmitter, getTracker } from './index';
import {
  generateObjectUpdateEvent,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from './test-helpers';

describe('Snowplow Tracker integration', () => {
  const emitter = getEmitter();
  const tracker = getTracker(emitter, 'pocket-backend-curated-corpus-api-dev');

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should accept a valid object_update event', async () => {
    tracker.track(generateObjectUpdateEvent());

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents).toEqual({ total: 1, bad: 0, good: 1 });
  });

  it('should not accept a invalid object_update event', async () => {
    // 'object' is a required property for the object_update event.
    tracker.track(generateObjectUpdateEvent({ object: undefined }));

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents).toEqual({ total: 1, bad: 1, good: 0 });
  });
});
