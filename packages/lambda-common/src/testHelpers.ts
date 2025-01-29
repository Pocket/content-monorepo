/**
 * Mocks fetch pocket image cache.
 *
 * Be sure to jest.restoreAllMocks() after calling this, as it modifies the
 * global fetch!
 *
 * @param statusCode
 * @param responseBody
 */
export const mockPocketImageCache = (
  statusCode: number,
  responseBody: any = null,
) => {
  global.fetch = jest.fn(
    () =>
      new Response(responseBody, {
        status: statusCode,
      }),
  ) as jest.Mock;
};
