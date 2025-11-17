const name = 'ProspectAPI';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
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
  envVars: {
    snowplowEndpoint,
  },
  tags: {
    service: `${name}-Sqs-Translation`,
    environment,
    app_code: 'content',
    component_code: `content-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
};
