import { serverLogger } from '@pocket-tools/ts-logger';
import * as Sentry from '@sentry/node';

import config from './config';
import { startServer } from './express';

Sentry.init({
  ...config.sentry,
  tracesSampleRate: 0.0,
  includeLocalVariables: true,
  maxValueLength: 2000,
  debug: config.sentry.environment == 'development',
});

(async () => {
  const { url } = await startServer(4026);
  serverLogger.info(`🚀 Server ready at http://localhost:4026${url}`);
})();
