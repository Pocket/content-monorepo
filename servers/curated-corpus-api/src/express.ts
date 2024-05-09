import cors from 'cors';
import express from 'express';
import http from 'http';

import * as Sentry from '@sentry/node';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
//See https://github.com/jaydenseric/graphql-upload/issues/305#issuecomment-1135285811 on why we do this
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';

import { serverLogger, setMorgan } from '@pocket-tools/ts-logger';

import { client } from './database/client';
import config from './config';
import { getAdminContext, IAdminContext } from './admin/context';
import { getPublicContext, IPublicContext } from './public/context';
import { startAdminServer } from './admin/server';
import { startPublicServer } from './public/server';

export async function startServer(port: number): Promise<{
  app: Express.Application;
  adminServer: ApolloServer<IAdminContext>;
  adminUrl: string;
  publicServer: ApolloServer<IPublicContext>;
  publicUrl: string;
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
    debug: config.sentry.environment == 'development',
  });

  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests.
  // Because NODE is a single running process loop!
  // MUST BE THE FIRST MIDDLEWARE ADDED!
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  app.use(
    // JSON parser to enable POST body with JSON
    express.json(),
    setMorgan(serverLogger),
  );

  app.use(
    graphqlUploadExpress({
      maxFileSize: config.app.upload.maxSize,
      maxFiles: config.app.upload.maxFiles,
    }),
  );

  // expose a health check url that makes sure the express app is up and the db
  // is reachable
  app.get('/.well-known/apollo/server-health', async (req, res) => {
    try {
      const db = client();
      await db.$queryRaw`SELECT 1`;
      res.status(200).send('ok');
      return;
    } catch (e) {
      res.status(500).send(`fail: ${e}`);
    }
  });

  // set up admin server
  const adminServer = await startAdminServer(httpServer);
  const adminUrl = '/admin';

  app.use(
    adminUrl,
    cors<cors.CorsRequest>(),
    expressMiddleware<IAdminContext>(adminServer, {
      context: getAdminContext,
    }),
  );

  // set up public server
  const publicServer = await startPublicServer(httpServer);
  const publicUrl = '/';

  app.use(
    publicUrl,
    cors<cors.CorsRequest>(),
    expressMiddleware<IPublicContext>(publicServer, {
      context: getPublicContext,
    }),
  );

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, adminServer, adminUrl, publicServer, publicUrl };
}
