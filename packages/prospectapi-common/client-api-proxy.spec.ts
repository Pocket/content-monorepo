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
  const successResponse = HttpResponse.json({ data: mockData });

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('returns data after a successful query', async () => {
    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        return successResponse;
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
        return callCount === 1
          ? HttpResponse.json({}, { status: 504 })
          : successResponse;
      }),
    );

    const result = await getUrlMetadata('https://example.com');

    expect(result).toEqual(mockData.itemByUrl);
  });
});
