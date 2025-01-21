const name = 'SectionManagerLambda';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const prefix = `${name}-${environment}`;

// we are currently in limbo regarding our data pipeline - leaving the below
// here commented out in case we end up staying with snowplow
//const snowplowEndpoint = isDev
//  ? 'com-getpocket-prod1.mini.snplow.net'
//  : 'd.getpocket.com';

export const config = {
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  environment,
  envVars: {
    //snowplowEndpoint,
  },
  isDev,
  name,
  prefix,
  shortName: 'SECMGL',
  tags: {
    service: name,
    environment,
    app_code: 'content',
    component_code: `content-${name.toLowerCase()}`,
    env_code: isDev ? 'dev' : 'prod',
  },
  // the queue timeout must be equal to or greater than the lambda execution
  // timeout. this is because SQS makes the message "invisible" after it is
  // retrieved by the lambda so no other consumers can attempt to process it.
  timeout: {
    // give the lambda 3 minutes to process each SQS message
    // TODO: monitor initial execution times to determine if we should
    // raise or lower this value.
    lambdaExecution: 180, // 3 minutes
    // if the lambdaExecution value changes, change the queue visibility value
    // accordingly.
    queueVisibility: 210, // 3 minutes, 30 seconds
  },
};
