import { MemcachedCache } from 'apollo-server-cache-memcached';

const config = {
  app: {
    upload: {
      maxSize: 10000000,
      maxFiles: 10,
    },
  },
  memcached: {
    servers: process.env.MEMCACHED_SERVERS
      ? process.env.MEMCACHED_SERVERS.split(',')
      : ['localhost:11212'],
  },
  apollo: {
    graphVariant: process.env.GRAPHQL_VARIANT || 'development',
    defaultMaxAge: 0,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
  auth: {
    //Cognito is deprecated in favor of Mozilla Auth Proxy, but we still need to support it
    //Mozilla Auth Proxy supports a larger number of user groups for a user.
    cognito: {
      jwtIssuer:
        process.env.COGNITO_JWT_ISSUER ||
        'cognito-idp.us-east-1.amazonaws.com/us-east-1_1alKls4qw',
      kids: process.env.COGNITO_KIDS?.split(',') || [
        'kze4M0CiXoDO7Qkpig1oH0F6OInzZg6ugk0PyojOlzc=',
        '4w35mrh4EBECpjJnyIjdQ60yjh3xeI1m0VF1H/z0T/c=',
      ],
    },
    mozillaAuthProxy: {
      jwtIssuer:
        process.env.MOZILLA_AUTH_PROXY_JWT_ISSUER ||
        'cognito-idp.us-east-1.amazonaws.com/us-east-1_qYkccPmmu',
      kids: process.env.MOZILLA_AUTH_PROXY_KIDS?.split(',') || [
        'OR8erz5A8/hCkVdHczk879k2zUQXoAke9p8TQXsgKLQ=',
        'QtBbT/twDz6JmT99PQkAOB+QBhG4eJvxk8pOr7YzfWU=',
      ],
    },
    pocket: {
      jwtIssuer: process.env.POCKET_JWT_ISSUER || 'getpocket.com',
      kids:
        process.env.POCKET_KIDS?.split(',') ||
        process.env.NODE_ENV === 'production'
          ? ['CURMIG', 'CORPSL']
          : ['CMGDEV', 'CORDEV'],
    },
    defaultKid:
      process.env.DEFAULT_KID || 'OR8erz5A8/hCkVdHczk879k2zUQXoAke9p8TQXsgKLQ=',
  },
};

//Create a shared memcached to use within Parser
export const memcached = new MemcachedCache(config.memcached.servers, {
  timeout: 1000,
  retries: 3,
});

memcached.client.on('failure', function (details) {
  console.error(
    'Server ' +
      details.server +
      'went down due to: ' +
      details.messages.join(''),
  );
});

memcached.client.on('reconnecting', function (details) {
  console.error(
    'Total downtime caused by server ' +
      details.server +
      ' :' +
      details.totalDownTime +
      'ms',
  );
});

memcached.client.on('issue', function (details) {
  console.error(
    'Server ' +
      details.server +
      'had an issue due to: ' +
      details.messages.join(''),
  );
});

export default config;
