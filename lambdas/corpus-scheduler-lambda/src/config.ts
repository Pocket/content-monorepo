const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
  app: {
    name: 'Corpus-Scheduler-Lambda',
    environment: environment,
    isDev: isDev,
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      release: process.env.GIT_SHA || '',
    },
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.REGION || 'us-east-1',
  },
  AdminApi: isDev
    ? process.env.ADMIN_API_URI || 'https://admin-api.getpocket.dev'
    : process.env.ADMIN_API_URI || 'https://admin-api.getpocket.com',
  jwt: {
    key: process.env.JWT_KEY || 'CorpusSchedulerLambda/Dev/JWT_KEY',
    iss: process.env.JWT_ISS || 'https://getpocket.com',
    aud: process.env.JWT_AUD || 'https://admin-api.getpocket.com/',
    name: 'ML Corpus Scheduler Lambda User',
    userId: 'ML',
    groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
  },
  snowplow: {
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId: isDev ? 'corpus-scheduler-lambda-dev' : 'corpus-scheduler-lambda',
    schemas: {
      // published 2024-02-28
      scheduled_corpus_candidate:
        'iglu:com.pocket/scheduled_corpus_candidate/jsonschema/1-0-2',
      // published 2024-02-28
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-17',
    },
  },
};

export default config;
