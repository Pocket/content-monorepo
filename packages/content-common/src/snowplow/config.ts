import { RequiredRetryOptions } from 'got';

const snowplowEndpoint = process.env.SNOWPLOW_ENDPOINT || 'localhost:9090';

// Snowplow uses Got. By default, Got does not retry POST, so we need to enable this explicitly.
// https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md#methods
const retries: Partial<RequiredRetryOptions> = {
  limit: 3,
  methods: ['GET', 'POST'],
};

const config = {
  snowplow: {
    endpoint: snowplowEndpoint,
    // only testing and local development should talk over http - other envs
    // (prod, dev) should use https.
    // 127.0.0.1 is guarded against as an extra measure - local and testing
    // should always use localhost.
    httpProtocol:
      snowplowEndpoint.includes('localhost') ||
      snowplowEndpoint.includes('127.0.0.1')
        ? 'http'
        : 'https',
    bufferSize: 1,
    retries,
    namespace: 'pocket-backend',
  },
};

export default config;
