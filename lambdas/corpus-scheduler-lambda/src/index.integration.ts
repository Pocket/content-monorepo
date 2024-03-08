import * as Sentry from '@sentry/node';
import { setupServer } from 'msw/node';
import { Callback, Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { EventEmitter } from 'events';
import {
  createApprovedCorpusItemBody,
  createScheduledCandidate,
  createScheduledCandidates,
  createScheduledCorpusItemBody,
  getUrlMetadataBody,
  mockCreateApprovedCorpusItemOnce,
  mockCreateScheduledCorpusItemOnce,
  mockGetApprovedCorpusItemByUrl,
  mockGetUrlMetadata,
  mockSentry,
  mockSetTimeoutToReturnImmediately,
  subscribeToSentryRequests,
} from './testHelpers';
import { CorpusLanguage, ScheduledSurfaces } from 'content-common';
import {
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common/snowplow/test-helpers';
import { extractScheduledCandidateEntity } from './events/testHelpers';
import config from './config';
import { SnowplowScheduledCorpusCandidateErrorName } from './events/types';

/**
 * Imports processor from index
 * @param env Update process.env with these environment variables.
 */
const importProcessorWithEnv = async (
  env: Record<string, string>,
): Promise<{ processor: SQSHandler }> => {
  Object.assign(process.env, env);
  jest.resetModules(); // Reset modules to ensure the environment variable is used
  switch (process.env.TEST_ENV) {
    case 'dist':
      return import('../dist/index.js');
    default:
      return import('./index');
  }
};

describe('corpus scheduler lambda', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let defaultEnv: any;
  beforeAll(() => {
    // Save the original process.env before any tests run
    originalEnv = { ...process.env };
    defaultEnv = {
      ...originalEnv,
      ALLOWED_TO_SCHEDULE: 'true',
      ENABLE_SCHEDULED_DATE_VALIDATION: 'true',
      SENTRY_DSN:
        'https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@abc.ingest.sentry.io/1234567',
    };

    // Increase the Node listener limit to avoid the following warning.
    // MaxListenersExceededWarning: 11 error listeners added to [_NodeClientRequest]
    EventEmitter.defaultMaxListeners = 20; // Increase the limit
  });

  afterAll(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  // processor is re-imported before each test with default environment variables.
  // importProcessorWithEnv can be called by individual tests to override environment variables.
  let processor: SQSHandler;
  beforeEach(async () => {
    const module = await importProcessorWithEnv(defaultEnv);
    processor = module.processor;
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

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

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
    const allEvents = await waitForSnowplowEvents(record.candidates.length);
    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(record.candidates.length);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();
    expect(snowplowEntity.approved_corpus_item_external_id).toEqual(
      createApprovedCorpusItemBody.data.createApprovedCorpusItem.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_item_external_id).toEqual(
      createApprovedCorpusItemBody.data.createApprovedCorpusItem
        .scheduledSurfaceHistory[0].externalId,
    );
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.error_name).toBeUndefined();
    expect(snowplowEntity.error_description).toBeUndefined();
  });

  it('emits a Snowplow event if a previously approved candidate is successfully processed', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server);
    mockGetUrlMetadata(server);
    mockCreateScheduledCorpusItemOnce(server);

    await processor(fakeEvent, sqsContext, sqsCallback);

    // Exactly one Snowplow event should be emitted.
    const allEvents = await waitForSnowplowEvents(record.candidates.length);
    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(record.candidates.length);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();
    const expectedScheduledItem =
      createScheduledCorpusItemBody.data.createScheduledCorpusItem;
    expect(snowplowEntity.approved_corpus_item_external_id).toEqual(
      expectedScheduledItem.approvedItem.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_item_external_id).toEqual(
      expectedScheduledItem.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.error_name).toBeUndefined();
    expect(snowplowEntity.error_description).toBeUndefined();
  });

  describe('snowplow error handling', () => {
    interface MetadataErrorTestCase {
      candidateKey: string;
      parserKey: string;
      expectedSnowplowError: SnowplowScheduledCorpusCandidateErrorName;
    }

    const metadataErrorTestCases: MetadataErrorTestCase[] = [
      {
        candidateKey: 'title',
        parserKey: 'title',
        expectedSnowplowError:
          SnowplowScheduledCorpusCandidateErrorName.MISSING_TITLE,
      },
      {
        candidateKey: 'excerpt',
        parserKey: 'excerpt',
        expectedSnowplowError:
          SnowplowScheduledCorpusCandidateErrorName.MISSING_EXCERPT,
      },
      {
        candidateKey: 'image_url',
        parserKey: 'imageUrl',
        expectedSnowplowError:
          SnowplowScheduledCorpusCandidateErrorName.MISSING_IMAGE,
      },
    ];

    metadataErrorTestCases.forEach(
      ({ candidateKey, parserKey, expectedSnowplowError }) => {
        it(`should emit a Snowplow event when ${candidateKey} is missing with error_name=${expectedSnowplowError}`, async () => {
          mockGetApprovedCorpusItemByUrl(server, {
            data: {
              getApprovedCorpusItemByUrl: null,
            },
          });
          // Return metadata with one value missing.
          mockGetUrlMetadata(server, {
            data: {
              getUrlMetadata: {
                ...getUrlMetadataBody.data.getUrlMetadata,
                [parserKey]: undefined,
              },
            },
          });

          // Create a candidate with the same value missing as in getUrlMetadata above.
          const incompleteCandidate: any = createScheduledCandidate();
          incompleteCandidate.scheduled_corpus_item[candidateKey] = undefined;
          const fakeEvent = {
            Records: [
              {
                messageId: '1',
                body: JSON.stringify(
                  createScheduledCandidates([incompleteCandidate]),
                ),
              },
            ],
          } as unknown as SQSEvent;

          await processor(fakeEvent, sqsContext, sqsCallback);

          const allEvents = await waitForSnowplowEvents();
          expect(allEvents).toEqual({ total: 1, good: 1, bad: 0 });

          // Check that the right error was emitted.
          const snowplowEntity = await extractScheduledCandidateEntity();
          expect(snowplowEntity.error_name).toEqual(expectedSnowplowError);
          expect(snowplowEntity.error_description).toBeTruthy();
        });
      },
    );
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
    mockSentry(server);
    const sentryRequests = subscribeToSentryRequests(server);

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(sentryRequests).toHaveLength(1);
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
    mockSentry(server);
    const sentryRequests = subscribeToSentryRequests(server);

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(sentryRequests).toHaveLength(1);
  }, 17000);

  it('should not start scheduling if allowedToSchedule is false', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, { data: null });

    const { processor } = await importProcessorWithEnv({
      ALLOWED_TO_SCHEDULE: 'false',
    });

    // spy on console.log
    const consoleLogSpy = jest.spyOn(global.console, 'log');

    // null data should be returned, but enableScheduledDateValidation === false,
    // so should not schedule and print to console.log only
    await expect(
      processor(fakeEvent, sqsContext, sqsCallback),
    ).resolves.not.toThrowError();
    // expect log to console Scheduler lambda not allowed to schedule...
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Scheduler lambda not allowed to schedule...',
    );
  }, 7000);

  it('should not schedule if env is prod & not allowed scheduled surface', async () => {
    const { processor } = await importProcessorWithEnv({
      ENVIRONMENT: 'production',
    });

    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, { data: null });

    // spy on console.log
    const consoleLogSpy = jest.spyOn(global.console, 'log');

    // overwrite with NEW_TAB_EN_GB scheduled surface which is not allowed
    record.candidates[0].scheduled_corpus_item.scheduled_surface_guid =
      ScheduledSurfaces.NEW_TAB_EN_GB;
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
      'Cannot schedule candidate: a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 for surface NEW_TAB_EN_GB.',
    );
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate) (prod)', async () => {
    // mock the config.app.isDev
    jest.replaceProperty(config, 'app', {
      name: 'Corpus-Scheduler-Lambda',
      environment: 'test',
      isDev: false, // should be prod env
      sentry: {
        dsn: '',
        release: '',
      },
      allowedToSchedule: 'true',
      enableScheduledDateValidation: 'true',
    });

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
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful & valid scheduled surface but not allowed for scheduling (approve & schedule candidate) (dev)', async () => {
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

    // overwrite with NEW_TAB_EN_GB scheduled surface which is not allowed (but dev, so should be scheduled)
    record.candidates[0].scheduled_corpus_item.scheduled_surface_guid =
      ScheduledSurfaces.NEW_TAB_EN_GB;
    await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate) (dev)', async () => {
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
