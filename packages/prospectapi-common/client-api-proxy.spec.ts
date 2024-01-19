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

  // Helper function to setup server behavior
  const addProspectMetadataHandlerToServer = (errorCount: number = 0) => {
    let callCount = 0;

    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        callCount += 1;
        return callCount <= errorCount
          ? HttpResponse.json({}, { status: 504 })
          : HttpResponse.json({ data: mockData });
      }),
    );
  };

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('returns data after a successful query', async () => {
    addProspectMetadataHandlerToServer();

    const result = await getUrlMetadata('https://example.com');

    expect(result).toEqual(mockData.itemByUrl);
  });

  it('retries the query on failure', async () => {
    const errorCount = 2;
    addProspectMetadataHandlerToServer(errorCount);

    const startTime = Date.now();
    // Uses a low retryDelay of 100 ms to make the test faster.
    const retryDelay = 100;
    const result = await getUrlMetadata('https://example.com', retryDelay);
    const endTime = Date.now();

    expect(result).toEqual(mockData.itemByUrl);
    // Check that there was a delay between retries.
    expect(endTime - startTime).toBeGreaterThanOrEqual(errorCount * retryDelay);
  });

  it('throws an exception after 2 failed retries', async () => {
    // errorCount of 3 exceeds max retries (2), and will therefore fail.
    addProspectMetadataHandlerToServer(3);

    // Uses a low retryDelay of 100 ms to make the test faster.
    await expect(getUrlMetadata('https://example.com', 100)).rejects.toThrow(
      'Response not successful: Received status code 504',
    );
  });
});
