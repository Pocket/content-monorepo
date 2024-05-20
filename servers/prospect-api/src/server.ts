import { Server } from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginUsageReportingDisabled } from '@apollo/server/plugin/disabled';
import { buildSubgraphSchema } from '@apollo/subgraph';

import { errorHandler, sentryPlugin } from '@pocket-tools/apollo-utils';

import { AdminAPIUserContext } from './types';
import { resolvers } from './resolvers';
import typeDefs from './typeDefs';

/**
 * Sets up and configures an ApolloServer for the application.
 * every request
 * @returns ApolloServer
 * @param httpServer
 * @param isTest indicates that we're running automated tests
 */
export function getServer(
  httpServer: Server,
): ApolloServer<AdminAPIUserContext> {
  const plugins = [
    sentryPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // All our subgraphs are behind a VPC and a VPN so its safe to enable the Landing Page
    ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    // Enable the ftv trace in our response which will be used by the gateway, and ensure we include errors so we can see them in apollo studio.
    ApolloServerPluginInlineTrace({ includeErrors: { unmodified: true } }),
    // Disable Usage reporting on all subgraphs in all environments because our gateway/router will be the one reporting that.
    ApolloServerPluginUsageReportingDisabled(),
  ];

  return new ApolloServer<AdminAPIUserContext>({
    schema: buildSubgraphSchema([{ typeDefs: typeDefs, resolvers: resolvers }]),
    plugins,
    formatError: errorHandler,
  });
}

/**
 * Create and start the apollo server. Required to await server.start()
 * before applying middleware.
 */
export async function startApolloServer(
  httpServer: Server,
): Promise<ApolloServer<AdminAPIUserContext>> {
  const server = getServer(httpServer);
  await server.start();
  return server;
}
