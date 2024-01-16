import { ApolloServer, GraphQLRequestContext } from '@apollo/server';
import { Server } from 'http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { typeDefsAdmin } from '../typeDefs';
import { resolvers as resolversAdmin } from './resolvers';
import responseCachePlugin from '@apollo/server-plugin-response-cache';
import { errorHandler, sentryPlugin } from '@pocket-tools/apollo-utils';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginUsageReportingDisabled,
} from '@apollo/server/plugin/disabled';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { IAdminContext } from './context';

/**
 * Sets up and configures an ApolloServer for the application.
 * @param contextFactory function for creating the context with
 * every request
 * @returns ApolloServer
 */
export function getAdminServer(
  httpServer: Server
): ApolloServer<IAdminContext> {
  const defaultPlugins = [
    sentryPlugin,
    responseCachePlugin({
      // https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
      // The user id is added to the request header by the apollo gateway (client api)
      sessionId: async (requestContext: GraphQLRequestContext<IAdminContext>) =>
        requestContext?.request?.http?.headers?.has('userId')
          ? requestContext?.request?.http?.headers?.get('userId')
          : null,
    }),
    ApolloServerPluginDrainHttpServer({ httpServer }),
  ];
  const prodPlugins = [
    ApolloServerPluginLandingPageDisabled(),
    ApolloServerPluginInlineTrace(),
  ];
  const nonProdPlugins = [
    ApolloServerPluginLandingPageLocalDefault(),
    ApolloServerPluginInlineTraceDisabled(),
    // Usage reporting is enabled by default if you have APOLLO_KEY in your environment
    ApolloServerPluginUsageReportingDisabled(),
  ];

  const plugins =
    process.env.NODE_ENV === 'production'
      ? defaultPlugins.concat(prodPlugins)
      : defaultPlugins.concat(nonProdPlugins);
  return new ApolloServer<IAdminContext>({
    schema: buildSubgraphSchema({
      typeDefs: typeDefsAdmin,
      resolvers: resolversAdmin,
    }),
    plugins,
    formatError: errorHandler,
  });
}

/**
 * Create and start the apollo server. Required to await server.start()
 * before applying middleware.
 */
export async function startAdminServer(
  httpServer: Server
): Promise<ApolloServer<IAdminContext>> {
  const server = getAdminServer(httpServer);
  await server.start();
  return server;
}
