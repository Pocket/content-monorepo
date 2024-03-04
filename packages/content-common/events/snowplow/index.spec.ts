import * as Sentry from '@sentry/node';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getEmitter, getTracker } from './index';
import config from './config';
import {
  buildSelfDescribingEvent,
  PayloadBuilder,
} from '@snowplow/node-tracker';
import { resetSnowplowEvents, waitForSnowplowEvents } from './test-helpers';

/**
 * Generates an object_update Snowplow event
 * @param overrideData Optionally, allows the event data to be changed.
 */
const generateObjectUpdateEvent = (overrideData = {}): PayloadBuilder => {
  return buildSelfDescribingEvent({
    event: {
      schema: 'iglu:com.pocket/object_update/jsonschema/1-0-17',
      data: {
        trigger: 'scheduled_corpus_candidate_generated',
        object: 'scheduled_corpus_candidate',
        ...overrideData,
      },
    },
  });
};

describe('Snowplow Tracker', () => {
  const server = setupServer();
  const emitter = getEmitter();
  const tracker = getTracker(emitter, 'test-app-id');

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

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

  it('retries and sends a message to Sentry when emitter fails', async () => {
    let snowplowRequestCount = 0;

    const captureMessageSpy = jest
      .spyOn(Sentry, 'captureMessage')
      .mockImplementation();

    // Intercept HTTP requests to Snowplow's endpoint and return an error
    server.use(
      http.post(
        new RegExp(
          // Actual url: http://localhost:9090/com.snowplowanalytics.snowplow/tp2
          `${config.snowplow.httpProtocol}://${config.snowplow.endpoint}.*`,
        ),
        () => {
          snowplowRequestCount += 1;
          return HttpResponse.text('Simulated timeout', { status: 504 });
        },
      ),
    );

    // Send a dummy event to Snowplow, that will return a 504 from the above handler.
    tracker.track(generateObjectUpdateEvent());

    // Wait for requests to Snowplow. By default, backoff is about 2^0 + 2^1 + 2^2 = 7 seconds.
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Assert that Snowplow performs the expected number of retries.
    // It should be 1 higher than retries.limit, because the first request is not a retry.
    expect(snowplowRequestCount).toEqual(config.snowplow.retries.limit + 1);

    // Assert that Sentry's captureMessage was called.
    expect(captureMessageSpy).toHaveBeenCalled();

    // Clean up mocks
    captureMessageSpy.mockRestore();
  }, 10000);
});
