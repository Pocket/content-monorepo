import { getContext } from '../../context';
import { AdminAPIUserContext } from '../../types';
import express from 'express';
import http from 'http';
import { expressMiddleware } from '@apollo/server/express4';
import { startApolloServer } from '../../server';

export const getTestServer = async (port) => {
  // initialize express with exposed httpServer so that it may be
  // provided to drain plugin for graceful shutdown.
  const app = express();
  const httpServer = http.createServer(app);

  // JSON parser to enable POST body with JSON
  app.use(express.json());

  const apolloServer = await startApolloServer(httpServer, true);

  app.use(
    expressMiddleware<AdminAPIUserContext>(apolloServer, {
      context: async ({ req }) => getContext({ req }),
    })
  );

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, apolloServer, url: '/' };
};
