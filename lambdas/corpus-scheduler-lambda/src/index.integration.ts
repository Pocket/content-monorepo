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
} from 'content-common';
import {
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common/snowplow/test-helpers';
import { extractScheduledCandidateEntity } from './events/testHelpers';

describe('corpus scheduler lambda', () => {
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
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    await resetSnowplowEvents();
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

    const actual = await processor(fakeEvent, sqsContext, sqsCallback);

    expect(actual).toEqual({ batchItemFailures: [{ itemIdentifier: '1' }] });
  }, 7000);

  it('returns no batch item failures if curated-corpus-api request is successful', async () => {
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItemOnce();

    const actual = await processor(fakeEvent, sqsContext, sqsCallback);

    expect(actual).toEqual({ batchItemFailures: [] });
  });

  it('emits a Snowplow event if candidate is successfully processed', async () => {
    mockGetUrlMetadata();
    mockCreateApprovedCorpusItemOnce(createApprovedCorpusItemBody);

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
});
