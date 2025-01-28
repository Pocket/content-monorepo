import { initSentry } from '@pocket-tools/sentry';
import config from './config';

// Init sentry MUST come before any other imports for auto instrumentation to kick in (request isolation)
initSentry({
  ...config.sentry,
  skipOpenTelemetrySetup: true,
  integrations(integrations) {
    // we need to filter out NodeFetch integrations to avoid double tracing of
    // HTTP requests. HTTP instrumentation is already configured by default in
    // Sentry, which captures HTTP requests made by node fetch.
    return integrations.filter((integration) => {
      return integration.name !== 'NodeFetch';
    });
  },
});

import { nodeSDKBuilder } from '@pocket-tools/tracing';
import { unleash } from './unleash';

nodeSDKBuilder({ ...config.tracing, unleash: unleash() }).then(() => {
  startServer(config.app.port).then(async ({ publicUrl, adminUrl }) => {
    serverLogger.info(
      `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
    );

    serverLogger.info(
      `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
    );
  });
});

import { serverLogger } from '@pocket-tools/ts-logger';
import { startServer } from './express';

import {
  curatedCorpusEventEmitter,
  initItemEventHandlers,
} from './events/init';

import {
  corpusItemGleanEventHandler,
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  eventBusHandler
} from './events/eventHandlers';

// Initialize event handlers, this is outside server setup as tests
// mock event handling
initItemEventHandlers(curatedCorpusEventEmitter, [
  corpusItemSnowplowEventHandler,
  corpusScheduleSnowplowEventHandler,
  eventBusHandler,
  corpusItemGleanEventHandler,
]);
