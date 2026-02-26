import * as Sentry from '@sentry/node';
import config from './config';

// Init sentry MUST come before any other imports for auto instrumentation to kick in (request isolation)
Sentry.init({
  ...config.sentry,
  tracesSampleRate: 0.0,
  includeLocalVariables: true,
  maxValueLength: 2000,
});

import { serverLogger } from '@pocket-tools/ts-logger';
import { startServer } from './express';

(async () => {
  startServer(config.app.port).then(async ({ url }) => {
    serverLogger.info(
      `🚀 Admin server is ready at http://localhost:${config.app.port}${url}`,
    );
  });
})();
