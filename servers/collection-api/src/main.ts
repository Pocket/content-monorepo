// nodeSDKBuilder must be the first import!!
import { serverLogger } from '@pocket-tools/ts-logger';

import config from './config';

import { startServer } from './express';

(async () => {
  const { adminUrl, publicUrl } = await startServer(config.app.port);

  serverLogger.info(
    `🚀 Public server is ready at http://localhost:${config.app.port}${publicUrl}`,
  );

  serverLogger.info(
    `🚀 Admin server is ready at http://localhost:${config.app.port}${adminUrl}`,
  );
})();
