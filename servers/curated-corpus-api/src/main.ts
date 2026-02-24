import * as Sentry from '@sentry/node';
import config from './config';

// Init sentry MUST come before any other imports for auto instrumentation to kick in (request isolation)
Sentry.init({
  ...config.sentry,
  tracesSampleRate: 0.0,
  includeLocalVariables: true,
  maxValueLength: 2000,
  integrations: [Sentry.prismaIntegration()],
});

import { serverLogger } from '@pocket-tools/ts-logger';
import { startServer } from './express';

import {
  curatedCorpusEventEmitter,
  initItemEventHandlers,
} from './events/init';

import {
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  sectionSnowplowEventHandler,
  sectionItemSnowplowEventHandler,
} from './events/eventHandlers';

// Initialize event handlers, this is outside server setup as tests
// mock event handling
initItemEventHandlers(curatedCorpusEventEmitter, [
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  sectionSnowplowEventHandler,
  sectionItemSnowplowEventHandler,
]);

(async () => {
  startServer(config.app.port).then(async ({ publicUrl, adminUrl }) => {
    serverLogger.info(
      `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
    );

    serverLogger.info(
      `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
    );
  });
})();
