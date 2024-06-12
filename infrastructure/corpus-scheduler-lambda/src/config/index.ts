const name = 'CorpusSchedulerLambda';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const prefix = `${name}-${environment}`;
const snowplowEndpoint = isDev
  ? 'com-getpocket-prod1.mini.snplow.net'
  : 'd.getpocket.com';

export const config = {
  name,
  isDev,
  prefix,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'CORPSL',
  environment,
  envVars: {
    snowplowEndpoint,
  },
  tags: {
    service: name,
    environment,
    app_code: 'content',
    component_code: `content-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
};
