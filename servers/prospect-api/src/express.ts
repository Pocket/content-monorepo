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
import config from './config';

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

  Sentry.init({
    ...config.sentry,
    includeLocalVariables: true,
    maxValueLength: 2000,
    integrations: [
      // apollo integration is broken at the moment 😕
      // https://github.com/getsentry/sentry-javascript/issues/6899
      //new Sentry.Integrations.Apollo(),
      new Sentry.Integrations.GraphQL(),
      new Sentry.Integrations.Mysql(),
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({
        // to trace all requests to the default router
        app,
      }),
    ],
    debug: config.sentry.environment === 'development',
  });

  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests.
  // Because NODE is a single running process loop!
  // MUST BE THE FIRST MIDDLEWARE ADDED!
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

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
    }),
  );

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, apolloServer, url };
}
