export default {
  environment: process.env.NODE_ENV || 'development',
  app: {
    port: 4026,
    prospectBatchSize: 50, // # of prospects we return at once to the client
    removeReasonMaxLength: 100, // max length of remove reason text we allow
    serviceName: 'prospect-api',
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
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId:
      process.env.NODE_ENV === 'production'
        ? 'pocket-backend-prospect-api'
        : 'pocket-backend-prospect-api-dev',
    schemas: {
      // published 2024-01-26
      prospect: 'iglu:com.pocket/prospect/jsonschema/1-0-3',
      // published 2024-01-02
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-16',
    },
  },
  tracing: {
    flagName: 'perm.content.tracing.prospect-api',
    release: process.env.GIT_SHA || 'local',
    serviceName: 'prospect-api',
    url: process.env.OTLP_COLLECTOR_URL || 'http://localhost:4318',
  },
  unleash: {
    clientKey: process.env.UNLEASH_KEY || 'unleash-key-fake',
    endpoint: process.env.UNLEASH_ENDPOINT || 'http://localhost:4242/api',
    refreshInterval: 60 * 1000, // ms
    timeout: 2 * 1000, // ms
  },
};
