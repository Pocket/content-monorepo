const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
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
  environment: process.env.ENVIRONMENT || 'development',
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    dynamoDb: {
      table:
        process.env.PROSPECT_API_PROSPECTS_TABLE || 'PROAPI-local-Prospects',
      maxBatchDelete: 25, // this is a dynamo-enforced limit
      maxAgeBeforeDeletion: 30, // if a prospect has been around more than 30 minutes, it's ripe for deletion
    },
  },
};

export default config;
