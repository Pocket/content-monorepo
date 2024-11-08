import { serverLogger } from '@pocket-tools/ts-logger';
import * as Sentry from '@sentry/node';

import {
  curatedCorpusEventEmitter,
  initItemEventHandlers,
} from './events/init';

import {
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  eventBusHandler,
} from './events/eventHandlers';

import { startServer } from './express';
import config from './config';

Sentry.init({
  ...config.sentry,
  tracesSampleRate: 0.0,
  includeLocalVariables: true,
  maxValueLength: 2000,
  integrations: [Sentry.prismaIntegration()],
  debug: config.sentry.environment == 'development',
});

// Initialize event handlers, this is outside server setup as tests
// mock event handling
initItemEventHandlers(curatedCorpusEventEmitter, [
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  eventBusHandler,
]);

(async () => {
  const { adminUrl, publicUrl } = await startServer(config.app.port);

  serverLogger.info(
    `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
  );

  serverLogger.info(
    `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
  );
})();
