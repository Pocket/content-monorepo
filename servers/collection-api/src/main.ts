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
  const { adminUrl, publicUrl } = await startServer(config.app.port);

  serverLogger.info(
    `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
  );

  serverLogger.info(
    `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
  );
});

import { startServer } from './express';
