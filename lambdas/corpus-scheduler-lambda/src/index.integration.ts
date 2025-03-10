import * as Sentry from '@sentry/serverless';
import { Callback, Context, SQSEvent } from 'aws-lambda';
import { setupServer } from 'msw/node';

import {
  CorpusLanguage,
  ScheduledSurfacesEnum,
  resetSnowplowEvents,
  waitForSnowplowEvents,
  CuratedCorpusApiErrorCodes,
} from 'content-common';
import { mockPocketImageCache } from 'lambda-common';

import {
  createApprovedCorpusItemBody,
  createScheduledCandidate,
  createScheduledCandidates,
  createScheduledCorpusItemBody,
  mockCreateApprovedCorpusItem,
  mockCreateScheduledCorpusItem,
  mockGetApprovedCorpusItemByUrl,
  mockGetUrlMetadata,
} from './testHelpers';
import { extractScheduledCandidateEntity } from './events/testHelpers';
import * as Jwt from './jwt';
import config from './config';
import { SnowplowScheduledCorpusCandidateErrorName } from './events/types';
import { processor } from './';
import * as GraphQlApiCalls from './graphQlApiCalls';

describe('corpus scheduler lambda', () => {
  const server = setupServer();

  let captureExceptionSpy: jest.SpyInstance<
    string,
    [exception: any, hint?: any],
    any
  >;
  let consoleLogSpy: jest.SpyInstance<
    void,
    [message?: any, ...optionalParams: any[]],
    any
  >;

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

  afterEach(() => {
    // restoreAllMocks restores all mocks and replaced properties. clearAllMocks only clears mocks.
    jest.restoreAllMocks();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    // The Lambda waits for 10 seconds to flush Snowplow events. During tests we don't want to wait that long.
    jest.replaceProperty(config.snowplow, 'emitterDelay', 500);

    jest
      .spyOn(Jwt, 'getJwtBearerToken')
      .mockReturnValue(Promise.resolve('test-jwt'));

    // spy on Sentry captureException
    captureExceptionSpy = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation();

    // spy on console.log
    consoleLogSpy = jest.spyOn(global.console, 'log');

    mockPocketImageCache(200);
  });

  const scheduledCandidate = createScheduledCandidate({
    title: 'Fake title',
    excerpt: 'fake excerpt',
    image_url: 'https://fake-image-url.com',
    language: CorpusLanguage.EN,
    authors: ['Fake Author'],
    url: 'https://index.integration.ts-fake-url.com',
  });

  const record = createScheduledCandidates([scheduledCandidate]);
  const fakeEvent = {
    Records: [{ messageId: '1', body: JSON.stringify(record) }],
  } as unknown as SQSEvent;
  const sqsContext = null as unknown as Context;
  const sqsCallback = null as unknown as Callback;

  it('emits a Snowplow event if candidate is successfully processed', async () => {
    await resetSnowplowEvents();

    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem();

    await processor(fakeEvent, sqsContext, sqsCallback);

    // Exactly one Snowplow event should be emitted.
    const allEvents = await waitForSnowplowEvents(record.candidates.length);

    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(record.candidates.length);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();
    expect(snowplowEntity.approved_corpus_item_external_id).toEqual(
      createApprovedCorpusItemBody.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_item_external_id).toEqual(
      createApprovedCorpusItemBody.scheduledSurfaceHistory[0].externalId,
    );
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.scheduled_date).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_date,
    );
    expect(snowplowEntity.scheduled_surface_id).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_surface_guid,
    );
    expect(snowplowEntity.error_name).toBeUndefined();
    expect(snowplowEntity.error_description).toBeUndefined();
  });

  it('emits a Snowplow event if a previously approved candidate is successfully processed', async () => {
    await resetSnowplowEvents();

    mockGetApprovedCorpusItemByUrl();
    mockCreateScheduledCorpusItem();

    await processor(fakeEvent, sqsContext, sqsCallback);

    // Exactly one Snowplow event should be emitted.
    const allEvents = await waitForSnowplowEvents(record.candidates.length);
    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(record.candidates.length);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();

    expect(snowplowEntity.approved_corpus_item_external_id).toEqual(
      createScheduledCorpusItemBody.approvedItem.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_item_external_id).toEqual(
      createScheduledCorpusItemBody.externalId,
    );
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.scheduled_date).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_date,
    );
    expect(snowplowEntity.scheduled_surface_id).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_surface_guid,
    );
    expect(snowplowEntity.error_name).toBeUndefined();
    expect(snowplowEntity.error_description).toBeUndefined();
  });

  it('emits a Snowplow event if the same item was already scheduled', async () => {
    await resetSnowplowEvents();

    mockGetApprovedCorpusItemByUrl();
    jest
      .spyOn(GraphQlApiCalls, 'createScheduledCorpusItem')
      .mockImplementation(() => {
        throw new Error(
          `createScheduledCorpusItem mutation failed with ${CuratedCorpusApiErrorCodes.ALREADY_SCHEDULED}`,
        );
      });

    await processor(fakeEvent, sqsContext, sqsCallback);

    // Exactly one Snowplow event should be emitted.
    const allEvents = await waitForSnowplowEvents(record.candidates.length);
    expect(allEvents.bad).toEqual(0);
    expect(allEvents.good).toEqual(1);

    // Check that the right Snowplow entity that was included with the event.
    const snowplowEntity = await extractScheduledCandidateEntity();
    expect(snowplowEntity.scheduled_corpus_candidate_id).toEqual(
      record.candidates[0].scheduled_corpus_candidate_id,
    );
    expect(snowplowEntity.scheduled_date).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_date,
    );
    expect(snowplowEntity.scheduled_surface_id).toEqual(
      record.candidates[0].scheduled_corpus_item.scheduled_surface_guid,
    );
    expect(snowplowEntity.error_name).toEqual(
      SnowplowScheduledCorpusCandidateErrorName.ALREADY_SCHEDULED,
    );
    expect(snowplowEntity.error_description).toBeTruthy();
  });

  it('sends a Sentry error if curated-corpus-api has error, with partial success', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    jest
      .spyOn(GraphQlApiCalls, 'createApprovedAndScheduledCorpusItem')
      .mockImplementation(() => {
        throw new Error(`random server error`);
      });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).toHaveBeenCalled();
  }, 7000);

  it('sends a Sentry error if curated-corpus-api returns null data', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem(null);

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).toHaveBeenCalled();
  }, 7000);

  it('should not start scheduling if allowedToSchedule is false', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem(null);

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
      version: 'fake-sha',
    });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;
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
      version: 'fake-sha',
    });

    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem(null);

    // overwrite with NEW_TAB_EN_GB scheduled surface which is not allowed
    record.candidates[0].scheduled_corpus_item.scheduled_surface_guid =
      ScheduledSurfacesEnum.NEW_TAB_EN_GB;
    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;
    // null data should be returned, but enableScheduledDateValidation === false,
    // so should not schedule and print to console.log only
    await expect(
      processor(fakeEvent, sqsContext, sqsCallback),
    ).resolves.not.toThrowError();
    // expect log to console Scheduler lambda not allowed to schedule...
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Cannot schedule candidate: a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 for surface NEW_TAB_EN_GB.',
    );
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate) (prod) (EN_US)', async () => {
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
      version: 'fake-sha',
    });

    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem();

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate) (prod) (DE_DE)', async () => {
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
      version: 'fake-sha',
    });

    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem();

    // overwrite with NEW_TAB_DE_DE scheduled surface
    record.candidates[0].scheduled_corpus_item.scheduled_surface_guid =
      ScheduledSurfacesEnum.NEW_TAB_DE_DE;
    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful & valid scheduled surface but not allowed for scheduling (approve & schedule candidate) (dev)', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem();

    // overwrite with NEW_TAB_EN_GB scheduled surface which is not allowed (but dev, so should be scheduled)
    record.candidates[0].scheduled_corpus_item.scheduled_surface_guid =
      ScheduledSurfacesEnum.NEW_TAB_EN_GB;
    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  }, 7000);

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (approve & schedule candidate) (dev)', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(null);
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItem();

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });

  it('does not emit Sentry exceptions if curated-corpus-api request is successful (schedule item only)', async () => {
    // returns an approved corpus item so only needs to be scheduled
    mockGetApprovedCorpusItemByUrl();
    mockCreateScheduledCorpusItem();

    await processor(fakeEvent, sqsContext, sqsCallback);

    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });
});
