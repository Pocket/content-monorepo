const environment = process.env.ENVIRONMENT || 'development';
const snowplowEndpoint = process.env.SNOWPLOW_ENDPOINT || 'localhost:9090';

const config = {
  snowplow: {
    endpoint: snowplowEndpoint,
    httpProtocol: environment === 'production' ? 'https' : 'http',
    bufferSize: 1,
    retries: 3,
    namespace: 'content-engineering',
  },
};

export default config;
