const name = 'CorpusSchedulerLambda';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const prefix = `${name}-${environment}`;
export const config = {
  name,
  isDev,
  prefix,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'CORPSL',
  environment,
  tags: {
    service: name,
    environment,
  },
};
