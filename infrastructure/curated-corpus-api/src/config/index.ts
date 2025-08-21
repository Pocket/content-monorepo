import { infraConfig } from 'infrastructure-common';

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
  // set on 2024-12-04 after slowly reducing from 64 & monitoring performance.
  // note - during the minimum ACU reduction period (~2 weeks), CPU usage never
  // climbed over 1% - even with a minimum ACU of 4. we could potentially reduce
  // the minimum down to 2 or lower, but of course upcoming product/system usage
  // and changes should be considered.
  minCapacity: isDev ? 1 : 4,
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
  pagerduty: infraConfig.pagerduty,
  tracing: {
    url: isDev
      ? 'https://otel-collector.getpocket.dev:443'
      : 'https://otel-collector.readitlater.com:443',
  },
};
