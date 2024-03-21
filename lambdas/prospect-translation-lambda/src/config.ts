const config = {
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
  sentry: {
    // these values are inserted into the environment in
    // .aws/src/sqsLambda.ts
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
  },
};

export default config;
