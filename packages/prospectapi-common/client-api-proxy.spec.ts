import { graphql, HttpResponse } from 'msw';
import { getUrlMetadata } from './client-api-proxy';
import { setupServer } from 'msw/node';

describe('getUrlMetadata', () => {
  const mockData = {
    itemByUrl: {
      resolvedUrl: 'https://example.com',
      excerpt: 'Example excerpt',
      title: 'Example Title',
    },
  };

  const server = setupServer();

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('returns data after a successful query', async () => {
    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        return HttpResponse.json({ data: mockData });
      }),
    );

    const result = await getUrlMetadata('https://example.com');

    expect(result).toEqual(mockData.itemByUrl);
  });

  it('retries the query on failure', async () => {
    let callCount = 0;

    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        callCount += 1;
        return callCount < 3 // First and second request will error out
          ? HttpResponse.json({}, { status: 504 })
          : HttpResponse.json({ data: mockData });
      }),
    );

    const result = await getUrlMetadata('https://example.com');

    expect(result).toEqual(mockData.itemByUrl);
  }, 8000); // Set test timeout to 5 seconds, because fetch-retry is configured with 2 + 4 = 6 seconds of delay.

  it('retries the query on failure', async () => {
    let callCount = 0;

    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        callCount += 1;
        return callCount < 4 // First and second request will error out
          ? HttpResponse.json({}, { status: 504 })
          : HttpResponse.json({ data: mockData });
      }),
    );

    const result = await getUrlMetadata('https://example.com');

    expect(result).toEqual(mockData.itemByUrl);
  }, 8000); // Set test timeout to 5 seconds, because fetch-retry is configured with 2 + 4 = 6 seconds of delay.
});
