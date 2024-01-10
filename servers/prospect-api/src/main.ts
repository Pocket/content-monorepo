import { serverLogger, startServer } from './express';

(async () => {
  const { url } = await startServer(4026);
  serverLogger.info(`🚀 Server ready at http://localhost:4026${url}`);
})();
