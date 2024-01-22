const name = 'CuratedCorpusAPI';
const domainPrefix = 'curated-corpus-api';
const isDev = process.env.NODE_ENV === 'development';
const branch = isDev ? 'dev' : 'main';
const environment = isDev ? 'Dev' : 'Prod';
const domain = isDev
  ? `${domainPrefix}.getpocket.dev`
  : `${domainPrefix}.readitlater.com`;

const githubConnectionArn = isDev
  ? 'arn:aws:codestar-connections:us-east-1:410318598490:connection/7426c139-1aa0-49e2-aabc-5aef11092032'
  : 'arn:aws:codestar-connections:us-east-1:996905175585:connection/5fa5aa2b-a2d2-43e3-ab5a-72ececfc1870';
const snowplowEndpoint = isDev
  ? 'com-getpocket-prod1.mini.snplow.net'
  : 'com-getpocket-prod1.collector.snplow.net';

const rds = {
  minCapacity: isDev ? 1 : 8,
  maxCapacity: isDev ? 1 : undefined,
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
  },
  codePipeline: {
    githubConnectionArn,
    repository: 'pocket/curated-corpus-api',
    branch,
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
