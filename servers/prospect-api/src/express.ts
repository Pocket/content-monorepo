import * as Sentry from '@sentry/node';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
//See https://github.com/jaydenseric/graphql-upload/issues/305#issuecomment-1135285811 on why we do this
import config from './config';
import { startApolloServer } from './server';
import { getContext } from './context';
import { AdminAPIUserContext } from './types';
import { setLogger, setMorgan } from '@pocket-tools/ts-logger';

export const serverLogger: any  = setLogger();

/**
 * Initialize an express server
 *
 * @param port number
 */
export async function startServer(port: number): Promise<{
  app: Express.Application;
  apolloServer: ApolloServer<AdminAPIUserContext>;
  url: string;
}> {
  Sentry.init({
    ...config.sentry,
    debug: config.sentry.environment === 'development',
  });

  // initialize express with exposed httpServer so that it may be
  // provided to drain plugin for graceful shutdown.
  const app = express();
  const httpServer = http.createServer(app);
  // JSON parser to enable POST body with JSON
  app.use(express.json(), setMorgan(serverLogger));
  // expose a health check url
  app.get('/.well-known/apollo/server-health', (req, res) => {
    res.status(200).send('ok');
  });

  const apolloServer = await startApolloServer(httpServer);
  const url = '/';

  app.use(
    cors<cors.CorsRequest>(),
    expressMiddleware<AdminAPIUserContext>(apolloServer, {
      context: async ({ req }) => getContext({ req }),
    })
  );

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, apolloServer, url };
}
