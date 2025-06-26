import cors from 'cors';
import express from 'express';
import http from 'http';

import * as Sentry from '@sentry/node';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { setLogger, setMorgan } from '@pocket-tools/ts-logger';

//See https://github.com/jaydenseric/graphql-upload/issues/305#issuecomment-1135285811 on why we do this
import { AdminAPIUserContext } from './types';
import { getContext } from './context';
import { startApolloServer } from './server';

export const serverLogger: any = setLogger();

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
    url,
    cors<cors.CorsRequest>(),
    express.json(),
    (req, res, next) => {
      if (!req.body) {
        req.body = {};
      }
      next();
    },
    expressMiddleware<AdminAPIUserContext>(apolloServer, {
      context: async ({ req }) => getContext({ req }),
    }),
  );

  // The error handler must be before any other error middleware and after all controllers
  Sentry.setupExpressErrorHandler(app);

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, apolloServer, url };
}
