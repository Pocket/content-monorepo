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
  : 'com-getpocket-prod1.collector.snplow.net';

// Firehose infra-as-code is defined in AWS Metaflow CloudFormation for production and development, respectively:
// https://github.com/Pocket/cloudformation-templates/blob/main/service/MetaflowTools/parameters_prod.json#L92
// https://github.com/Pocket/cloudformation-templates/blob/main/service/MetaflowTools/parameters_dev.json#L101
const metaflowFirehoseName = isDev
  ? 'MetaflowTools-Dev-firehose'
  : 'MetaflowTools-Prod-1-RecsAPICandidateSet';

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
    eventDetailType: 'prospect-generation',
    metaflowFirehoseName,
    snowplowEndpoint,
  },
  tags: {
    service: name,
    environment,
  },
};
