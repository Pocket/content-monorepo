const name = 'CuratedCorpusAPI';
const domainPrefix = 'curated-corpus-api';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const domain = isDev
  ? `${domainPrefix}.getpocket.dev`
  : `${domainPrefix}.readitlater.com`;

const snowplowEndpoint = isDev
  ? 'com-getpocket-prod1.mini.snplow.net'
  : 'd.getpocket.com';

const rds = {
  minCapacity: isDev ? 1 : 64, // TODO: do we need this high for min?
  maxCapacity: isDev ? 1 : 128, // max allowed by AWS for Aurora Serverless V2
};

export const config = {
  name,
  isDev,
  prefix: `${name}-${environment}`,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'CCSAPI',
  environment,
  domain,
  rds,
  tags: {
    service: name,
    environment,
    app_code: 'pocket-content-shared',
    component_code: `content-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
  // The name of the Event Bus to publish events to (per account)
  eventBus: {
    name: 'default',
  },
  envVars: {
    snowplowEndpoint,
  },
  healthCheck: {
    command: [
      'CMD-SHELL',
      'curl -f http://localhost:4025/.well-known/apollo/server-health || exit 1',
    ],
    interval: 15,
    retries: 3,
    timeout: 5,
    startPeriod: 0,
  },
};
