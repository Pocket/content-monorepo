import { setupServer } from 'msw/node';
import { processor } from './';
import * as Utils from './utils';
import { Callback, Context, SQSEvent } from 'aws-lambda';
import {
  createScheduledCandidate,
  createScheduledCandidates,
  mockCreateApprovedCorpusItemOnce,
  mockCreateScheduledCorpusItemOnce,
  mockGetApprovedCorpusItemByUrl,
  mockGetUrlMetadata,
} from './testHelpers';
import { CorpusLanguage } from 'content-common';
import config from './config';

describe('corpus scheduler lambda', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const scheduledCandidate = createScheduledCandidate(
    'Fake title',
    'fake excerpt',
    'https://fake-image-url.com',
    CorpusLanguage.EN,
    ['Fake Author'],
    'https://fake-url.com',
  );

  const server = setupServer();
  const record = createScheduledCandidates([scheduledCandidate]);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    jest.spyOn(Utils, 'generateJwt').mockReturnValue('test-jwt');
    jest
      .spyOn(Utils, 'getCorpusSchedulerLambdaPrivateKey')
      .mockReturnValue(Promise.resolve('my_secret_value'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns batch item failure if curated-corpus-api has error, with partial success', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateScheduledCorpusItemOnce(server);
    mockCreateApprovedCorpusItemOnce(server, {
      errors: [{ message: 'server bork' }],
    });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    await expect(
      processor(
        fakeEvent,
        null as unknown as Context,
        null as unknown as Callback,
      ),
    ).rejects.toThrow(
      new Error(
        'processSQSMessages failed for a4b5d99c-4c1b-4d35-bccf-6455c8df07b0: Error: createApprovedCorpusItem mutation failed: server bork',
      ),
    );
  }, 7000);

  it('returns batch item failure if curated-corpus-api returns null data', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server, { data: null });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    await expect(
      processor(
        fakeEvent,
        null as unknown as Context,
        null as unknown as Callback,
      ),
    ).rejects.toThrow(Error);
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

  it('returns no batch item failures if curated-corpus-api request is successful', async () => {
    // returns null as we are trying to create & schedule a new item
    mockGetApprovedCorpusItemByUrl(server, {
      data: {
        getApprovedCorpusItemByUrl: null,
      },
    });
    mockGetUrlMetadata(server);
    mockCreateApprovedCorpusItemOnce(server);

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );
  });
});
