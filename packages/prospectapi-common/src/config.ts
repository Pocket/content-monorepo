export default {
  environment: process.env.NODE_ENV || 'development',
  app: {
    apolloClientName: 'ProspectAPI',
    clientApiEndpoint: 'https://client-api.getpocket.com',
    // the amount of time in ms between attempts to re-try getting metadata from the parser
    metadataRetryDelay: 10000,
    // the number of times we will retry hitting client API for parser metadata
    metadataRetries: 2,
    version: `${process.env.GIT_SHA ?? 'local'}`,
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    dynamoDb: {
      table:
        process.env.PROSPECT_API_PROSPECTS_TABLE || 'PROAPI-local-Prospects',
    },
  },
  // environment variables below are set in .aws/src/main.ts
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
};
