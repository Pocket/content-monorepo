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
      // Firehose is defined for production and development in AWS Metaflow CloudFormation:
      // https://github.com/Pocket/cloudformation-templates/blob/main/service/MetaflowTools/parameters_prod.json#L92
      // https://github.com/Pocket/cloudformation-templates/blob/main/service/MetaflowTools/parameters_dev.json#L101
      deliveryStreamName:
        process.env.ENVIRONMENT == 'production'
          ? 'MetaflowTools-Prod-1-RecsAPICandidateSet'
          : 'MetaflowTools-Dev-firehose',
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
