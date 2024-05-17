// nodeSDKBuilder must be the first import!!
import { nodeSDKBuilder } from '@pocket-tools/tracing';
import { serverLogger } from '@pocket-tools/ts-logger';

import config from './config';

nodeSDKBuilder({
  host: config.tracing.host,
  serviceName: config.tracing.serviceName,
  release: config.sentry.release,
  logger: serverLogger,
}).then(async () => {
  const { url } = await startServer(4026);
  serverLogger.info(`🚀 Server ready at http://localhost:4026${url}`);
});

import { startServer } from './express';
