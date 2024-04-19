// nodeSDKBuilder must be the first import!!
import {
  nodeSDKBuilder,
  AdditionalInstrumentation,
} from '@pocket-tools/tracing';

import config from './config';
import { serverLogger } from '@pocket-tools/ts-logger';

nodeSDKBuilder({
  host: config.tracing.host,
  serviceName: config.tracing.serviceName,
  release: config.sentry.release,
  logger: serverLogger,
  additionalInstrumentations: [AdditionalInstrumentation.PRISMA],
}).then(async () => {
  // Initialize event handlers, this is outside server setup as tests
  // mock event handling
  initItemEventHandlers(curatedCorpusEventEmitter, [
    corpusItemSnowplowEventHandler,
    corpusScheduleSnowplowEventHandler,
    eventBusHandler,
  ]);

  const { adminUrl, publicUrl } = await startServer(config.app.port);

  serverLogger.info(
    `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
  );

  serverLogger.info(
    `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
  );
});

// the rest of the imports need to come *after* initializing the nodeSDKBuilder
// above, because the SDKBuilder swizzles the code
// TODO: explain this better
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
