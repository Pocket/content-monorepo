import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { processor } from './';
import * as Utils from './utils';
import { Callback, Context, SQSEvent } from 'aws-lambda';
import {
  createScheduledCandidate,
  createScheduledCandidates,
} from './testHelpers';
import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
} from 'content-common/types';

describe('corpus scheduler lambda', () => {
  const server = setupServer();

  const scheduledCandidate = createScheduledCandidate(
    'Fake title',
    'fake excerpt',
    'https://fake-image-url.com',
    CorpusLanguage.EN,
    ['Fake Author'],
    'https://fake-url.com',
  );

  const record = createScheduledCandidates([scheduledCandidate]);

  const getUrlMetadataBody = {
    data: {
      getUrlMetadata: {
        url: 'https://fake-url.com',
        title: 'Fake title',
        excerpt: 'fake excerpt',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
        publisher: 'POLITICO',
        authors: 'Fake Author',
        imageUrl: 'https://fake-image-url.com',
        topic: Topics.SELF_IMPROVEMENT,
        source: CorpusItemSource.ML,
        isCollection: false,
        isSyndicated: false,
      },
    },
  };

  const createApprovedCorpusItemBody = {
    data: {
      createApprovedCorpusItem: {
        externalId: 'fake-external-id',
        url: 'https://fake-url.com',
        title: 'Fake title',
      },
    },
  };

  /**
   * Set up the mock server to return responses for the getUrlMetadata query.
   * @param responseBody GraphQL response body.
   */
  const mockGetUrlMetadata = (responseBody: any = getUrlMetadataBody) => {
    server.use(
      graphql.query('getUrlMetadata', () => {
        return HttpResponse.json(responseBody);
      }),
    );
  };

  /**
   * Set up the mock server to return responses for the createApprovedCorpusItem mutation.
   * @param body GraphQL response body.
   */
  const mockCreateApprovedCorpusItemOnce = (
    body: any = createApprovedCorpusItemBody,
  ) => {
    server.use(
      graphql.mutation(
        'CreateApprovedCorpusItem',
        () => {
          return HttpResponse.json(body);
        },
        { once: true },
      ),
    );
  };

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
    mockGetUrlMetadata();
    // Note: msw uses handlers in reverse order, so 2nd request will error, and 1st will succeed.
    mockCreateApprovedCorpusItemOnce({ errors: [{ message: 'server bork' }] });
    mockCreateApprovedCorpusItemOnce();

    const fakeEvent = {
      Records: [
        { messageId: '1', body: JSON.stringify(record) },
        { messageId: '2', body: JSON.stringify(record) },
      ],
    } as unknown as SQSEvent;

    const actual = await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(actual).toEqual({ batchItemFailures: [{ itemIdentifier: '2' }] });
  }, 7000);

  it('returns batch item failure if curated-corpus-api returns null data', async () => {
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItemOnce({ data: null });

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    const actual = await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(actual).toEqual({ batchItemFailures: [{ itemIdentifier: '1' }] });
  }, 7000);

  it('returns no batch item failures if curated-corpus-api request is successful', async () => {
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItemOnce();

    const fakeEvent = {
      Records: [{ messageId: '1', body: JSON.stringify(record) }],
    } as unknown as SQSEvent;

    const actual = await processor(
      fakeEvent,
      null as unknown as Context,
      null as unknown as Callback,
    );

    expect(actual).toEqual({ batchItemFailures: [] });
  });
});
