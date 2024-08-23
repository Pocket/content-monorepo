import { RequiredRetryOptions } from 'got';

const environment = process.env.ENVIRONMENT || 'development';
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
    httpProtocol: environment === 'production' ? 'https' : 'http',
    bufferSize: 1,
    retries,
    namespace: 'content',
  },
};

export default config;
