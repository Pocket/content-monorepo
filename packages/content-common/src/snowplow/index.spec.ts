import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getEmitter, getTracker } from './index';
import config from './config';
import { generateObjectUpdateEvent } from './test-helpers';

describe('Snowplow Tracker', () => {
  const mockErrorHandler = jest.fn();
  const server = setupServer();
  const emitter = getEmitter(mockErrorHandler);
  const tracker = getTracker(emitter, 'test-app-id');

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('retries and calls the provided error handler when emitter fails', async () => {
    let snowplowRequestCount = 0;

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

    // Assert that the provided error handler was called
    expect(mockErrorHandler).toHaveBeenCalled();
  }, 10000);
});
