const name = 'ProspectAPI';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const snowplowEndpoint = isDev
  ? '73fbdaf4-dfc6-45b4-a597-be7a758b53d4.apps.snowplowanalytics.com'
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
