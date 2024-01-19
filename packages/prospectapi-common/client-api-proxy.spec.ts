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

  /**
   * Set up the mock server to return responses for the ProspectApiUrlMetadata query.
   * @param errorCount Number of times to error out (default 0), before returning a successful response.
   */
  const addProspectMetadataHandlerToServer = (errorCount: number = 0) => {
    let callCount = 0;

    server.use(
      graphql.query('ProspectApiUrlMetadata', () => {
        callCount += 1;
        // For the first errorCount number of requests, return a 504 error, then return a success response.
        if (callCount <= errorCount) {
          return HttpResponse.json({}, { status: 504 });
        } else {
          return HttpResponse.json({ data: mockData });
        }
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
