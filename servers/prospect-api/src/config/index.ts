const snowplowHttpProtocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';

export default {
  environment: process.env.NODE_ENV || 'development',
  app: {
    prospectBatchSize: 50, // # of prospects we return at once to the client
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    dynamoDb: {
      table:
        process.env.PROSPECT_API_PROSPECTS_TABLE || 'PROAPI-local-Prospects',
    },
    eventBus: {
      name:
        process.env.EVENT_BUS_NAME || 'PocketEventBridge-Dev-Shared-Event-Bus',
      eventBridge: { source: 'prospect-events' },
    },
  },
  // environment variables below are set in .aws/src/main.ts
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
  // The App ID value is used to let the Analytics team know the origin of this event.
  eventBridge: {
    appId: 'pocket-prospect-api',
  },
  snowplow: {
    endpoint: process.env.SNOWPLOW_ENDPOINT || 'localhost:9090',
    httpProtocol: snowplowHttpProtocol,
    bufferSize: 1,
    retries: 3,
    namespace: 'pocket-backend',
    appId: 'pocket-backend-prospect-api',
    schemas: {
      // published 2024-01-26
      prospect: 'iglu:com.pocket/prospect/jsonschema/1-0-1',
      // published 2024-01-02
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-16',
    },
  },
};
