import * as Sentry from '@sentry/node';
import { setupServer } from 'msw/node';
import { processor } from './';
import * as Utils from './utils';
import { Callback, Context, SQSEvent } from 'aws-lambda';
import {
  createApprovedCorpusItemBody,
  createScheduledCandidate,
  createScheduledCandidates,
  mockCreateApprovedCorpusItemOnce,
  mockCreateScheduledCorpusItemOnce,
  mockGetApprovedCorpusItemByUrl,
  mockGetUrlMetadata,
  mockSetTimeoutToReturnImmediately,
} from './testHelpers';
import { CorpusLanguage } from 'content-common';
import {
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common/snowplow/test-helpers';
import { extractScheduledCandidateEntity } from './events/testHelpers';
import config from './config';

describe('corpus scheduler lambda', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    // Need to restoreAllMocks after each test, such that resetSnowplowEvents can call setTimeout to
    // wait for Snowplow events to arrive from the last test. Alternatively, we could call
    // waitForSnowplowEvents() in each test where a Snowplow event is emitted.
    jest.restoreAllMocks();
    await resetSnowplowEvents();
    // The Lambda waits for 10 seconds to flush Snowplow events. During tests we don't want to wait that long.
    mockSetTimeoutToReturnImmediately();
  });

  const server = setupServer();

  const scheduledCandidate = createScheduledCandidate({
    title: 'Fake title',
    excerpt: 'fake excerpt',
    image_url: 'https://fake-image-url.com',
    language: CorpusLanguage.EN,
    authors: ['Fake Author'],
    url: 'https://fake-url.com',
  });

  const record = createScheduledCandidates([scheduledCandidate]);
  const fakeEvent = {
    Records: [{ messageId: '1', body: JSON.stringify(record) }],
  } as unknown as SQSEvent;
  const sqsContext = null as unknown as Context;
  const sqsCallback = null as unknown as Callback;

  // const getUrlMetadataBody = {
  //   data: {
  //     getUrlMetadata: {
  //       url: 'https://fake-url.com',
  //       title: 'Fake title',
  //       excerpt: 'fake excerpt',
  //       status: CuratedStatus.RECOMMENDATION,
  //       language: 'EN',
  //       publisher: 'POLITICO',
  //       authors: 'Fake Author',
  //       imageUrl: 'https://fake-image-url.com',
  //       topic: Topics.SELF_IMPROVEMENT,
  //       source: CorpusItemSource.ML,
  //       isCollection: false,
  //       isSyndicated: false,
  //     },
  //   },
  // };
  //
  // const createApprovedCorpusItemBody = {
  //   data: {
  //     createApprovedCorpusItem: {
  //       externalId: 'fake-external-id',
  //       url: 'https://fake-url.com',
  //       title: 'Fake title',
  //     },
  //   },
  // };
  //
  // /**
  //  * Set up the mock server to return responses for the getUrlMetadata query.
  //  * @param responseBody GraphQL response body.
  //  */
  // const mockGetUrlMetadata = (responseBody: any = getUrlMetadataBody) => {
  //   server.use(
  //       graphql.query('getUrlMetadata', () => {
  //         return HttpResponse.json(responseBody);
  //       }),
  //   );
  // };
  //
  // /**
  //  * Set up the mock server to return responses for the createApprovedCorpusItem mutation.
  //  * @param body GraphQL response body.
  //  */
  // const mockCreateApprovedCorpusItemOnce = (
  //     body: any = createApprovedCorpusItemBody,
  // ) => {
  //   server.use(
  //       graphql.mutation(
  //           'CreateApprovedCorpusItem',
  //           () => {
  //             return HttpResponse.json(body);
  //           },
  //           { once: true },
  //       ),
  //   );
  // };

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    jest.spyOn(Utils, 'generateJwt').mockReturnValue('test-jwt');
    jest
      .spyOn(Utils, 'getCorpusSchedulerLambdaPrivateKey')
      .mockReturnValue(Promise.resolve('my_secret_value'));
  });

  afterEach(() => {
    // restoreAllMocks restores all mocks and replaced properties. clearAllMocks only clears mocks.
    jest.restoreAllMocks();
  });

  it('emits a Snowplow event if candidate is successfully processed', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server);

    await processor(fakeEvent, sqsContext, sqsCallback);

    // Exactly one Snowplow event should be emitted.
    const allEvents = await waitForSnowplowEvents();
    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(record.candidates.length);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();
    expect(snowplowEntity.approved_corpus_item_external_id).toEqual(
      createApprovedCorpusItemBody.data.createApprovedCorpusItem.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.error_name).toBeUndefined();
    expect(snowplowEntity.error_description).toBeUndefined();
  });

  it('sends a Sentry error if curated-corpus-api has error, with partial success', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, {
      errors: [{ message: 'server bork' }],
    });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    const captureExceptionSpy = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation();

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).toHaveBeenCalled();
  }, 7000);

  it('sends a Sentry error if curated-corpus-api returns null data', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, { data: null });

    const captureExceptionSpy = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation();

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).toHaveBeenCalled();
  }, 7000);

  it('should not start scheduling if allowedToSchedule is false', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, { data: null });

    // mock the config.app.enableScheduledDateValidation
    jest.replaceProperty(config, 'app', {
      name: 'Corpus-Scheduler-Lambda',
      environment: 'test',
      isDev: true,
      sentry: {
        dsn: '',
        release: '',
      },
      allowedToSchedule: 'false',
      enableScheduledDateValidation: 'true',
    });

    // spy on console.log
    const consoleLogSpy = jest.spyOn(global.console, 'log');

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;
    // null data should be returned, but enableScheduledDateValidation === false,
    // so should not schedule and print to console.log only
    await expect(
      processor(
        fakeEvent,
        null as unknown as Context,
        null as unknown as Callback,
      ),
    ).resolves.not.toThrowError();
    // expect log to console Scheduler lambda not allowed to schedule...
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Scheduler lambda not allowed to schedule...',
    );
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate)', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server);

    const captureExceptionSpy = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation();

    await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (schedule item only)', async () => {
    // returns an approved corpus item so only needs to be scheduled
    mockGetApprovedCorpusItemByUrl(server);
    mockCreateScheduledCorpusItemOnce(server);

    const captureExceptionSpy = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation();

    await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });
});
