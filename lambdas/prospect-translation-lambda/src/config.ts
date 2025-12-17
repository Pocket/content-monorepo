import { ML_USERNAME } from 'content-common';

const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
  adminApiEndpoint: isDev
    ? process.env.ADMIN_API_URI || 'https://admin-api.getpocket.dev'
    : process.env.ADMIN_API_URI || 'https://admin-api.getpocket.com',
  app: {
    name: 'Prospect-Api-Translation-Lambda',
    environment: environment,
    isDev: isDev,
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      release: process.env.GIT_SHA || '',
    },
    version: process.env.GIT_SHA || '',
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    dynamoDb: {
      table:
        process.env.PROSPECT_API_PROSPECTS_TABLE || 'PROAPI-local-Prospects',
      maxBatchDelete: 25, // this is a dynamo-enforced limit
      maxAgeBeforeDeletion: 60, // if a prospect has been around more than 60 minutes, it's ripe for deletion
    },
  },
  jwt: {
    key: process.env.JWT_KEY || 'ProspectAPI/Dev/JWT_KEY',
    iss: process.env.JWT_ISS || 'https://getpocket.com',
    aud: process.env.JWT_AUD || 'https://admin-api.getpocket.com/',
    name: 'ML Prospect Translation Lambda User',
    userId: ML_USERNAME,
    groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
  },
  snowplow: {
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId: isDev
      ? 'pocket-prospect-translation-lambda-dev'
      : 'pocket-prospect-translation-lambda',
    emitterDelay: 10000,
    schemas: {
      // published 2024-05-02
      prospect: 'iglu:com.pocket/prospect/jsonschema/1-0-4',
      // published 2024-05-08
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-19',
    },
  },
};

export default config;
