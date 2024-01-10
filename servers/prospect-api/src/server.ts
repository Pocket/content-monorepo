import { ApolloServer } from '@apollo/server';
import { Server } from 'http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { resolvers } from './resolvers';
import { errorHandler, sentryPlugin } from '@pocket-tools/apollo-utils';
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginUsageReportingDisabled,
} from '@apollo/server/plugin/disabled';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import typeDefs from './typeDefs';
import { AdminAPIUserContext } from './types';

/**
 * Sets up and configures an ApolloServer for the application.
 * every request
 * @returns ApolloServer
 * @param httpServer
 * @param isTest indicates that we're running automated tests
 */
export function getServer(
  httpServer: Server,
  isTest?: boolean | false
): ApolloServer<AdminAPIUserContext> {
  const defaultPlugins = [
    ...(isTest
      ? []
      : [sentryPlugin, ApolloServerPluginDrainHttpServer({ httpServer })]),
  ];
  const testPlugins = [
    ApolloServerPluginUsageReportingDisabled(),
    ApolloServerPluginLandingPageDisabled(),
    ApolloServerPluginInlineTraceDisabled(),
  ];
  const prodPlugins = [
    ApolloServerPluginLandingPageDisabled(),
    ApolloServerPluginInlineTrace(),
  ];
  const nonProdPlugins = [
    ApolloServerPluginInlineTraceDisabled(),
    // Usage reporting is enabled by default if you have APOLLO_KEY in your environment
    ApolloServerPluginUsageReportingDisabled(),
  ];

  let plugins;
  if (isTest) {
    plugins = defaultPlugins.concat(testPlugins);
  } else {
    plugins =
      process.env.NODE_ENV === 'production'
        ? defaultPlugins.concat(prodPlugins)
        : defaultPlugins.concat(nonProdPlugins);
  }

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
  isTest?: boolean | false
): Promise<ApolloServer<AdminAPIUserContext>> {
  const server = getServer(httpServer);
  await server.start();
  return server;
}
