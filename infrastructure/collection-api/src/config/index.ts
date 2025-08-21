import { infraConfig } from 'infrastructure-common';

const name = 'CollectionAPI';
const domainPrefix = 'collection-api';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const domain = isDev
  ? `${domainPrefix}.getpocket.dev`
  : `${domainPrefix}.readitlater.com`;
const graphqlVariant = isDev ? 'development' : 'current';

// note that when maxCapacity is left undefined, it will default to 16 (which
// should be ample for us at this time - 2024-01-09)
// https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster#max_capacity
const rds = {
  minCapacity: isDev ? 1 : 4,
  maxCapacity: isDev ? 1 : 128,
};

export const config = {
  name,
  isDev,
  prefix: `${name}-${environment}`,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'COLAPI',
  environment,
  domain,
  graphqlVariant,
  rds,
  pagerduty: infraConfig.pagerduty,
  tags: {
    service: name,
    environment,
    app_code: 'pocket',
    component_code: `pocket-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
  tracing: {
    url: isDev
      ? 'https://otel-collector.getpocket.dev:443'
      : 'https://otel-collector.readitlater.com:443',
  },
};
