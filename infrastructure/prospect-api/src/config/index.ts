const name = 'ProspectAPI';
const isDev = process.env.NODE_ENV === 'development';
const githubConnectionArn = isDev
  ? 'arn:aws:codestar-connections:us-east-1:410318598490:connection/7426c139-1aa0-49e2-aabc-5aef11092032'
  : 'arn:aws:codestar-connections:us-east-1:996905175585:connection/5fa5aa2b-a2d2-43e3-ab5a-72ececfc1870';
const branch = isDev ? 'dev' : 'main';

let domain;
let environment;

if (process.env.NODE_ENV === 'development') {
  environment = 'Dev';
  domain = 'prospect-api.getpocket.dev';
} else {
  environment = 'Prod';
  domain = 'prospect-api.readitlater.com';
}

const snowplowEndpoint = isDev
  ? 'com-getpocket-prod1.mini.snplow.net'
  : 'd.getpocket.com';

export const config = {
  name,
  isDev,
  prefix: `${name}-${environment}`,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'PROAPI',
  environment,
  domain,
  codePipeline: {
    githubConnectionArn,
    repository: 'pocket/prospect-api',
    branch,
  },
  healthCheck: {
    command: [
      'CMD-SHELL',
      'curl -f http://localhost:4026/.well-known/apollo/server-health || exit 1',
    ],
    interval: 15,
    retries: 3,
    timeout: 5,
    startPeriod: 0,
  },
  envVars: {
    eventBusName: `PocketEventBridge-${environment}-Shared-Event-Bus`,
    snowplowEndpoint,
  },
  tags: {
    service: name,
    environment,
    app_code: 'content',
    component_code: `content-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
  tracing: {
    url: isDev
      ? 'https://otel-collector.getpocket.dev:443'
      : 'https://otel-collector.readitlater.com:443',
  },
};
