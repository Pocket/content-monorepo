import { serverLogger } from '@pocket-tools/ts-logger';

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
