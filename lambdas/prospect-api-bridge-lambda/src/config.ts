const config = {
  environment: process.env.ENVIRONMENT || 'development',
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    eventBridge: {
      eventBusName:
        process.env.EVENT_BRIDGE_BUS_NAME ||
        'PocketEventBridge-local-Shared-Event-Bus',
      source: 'prospect-events',
      detailType: 'prospect-generation',
    },
    firehose: {
      deliveryStreamName:
        process.env.METAFLOW_FIREHOSE_NAME ||
        'MetaflowTools-Local-1-RecsAPICandidateSet',
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
