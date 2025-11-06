import { Server } from 'http';

import { ApolloServer, GraphQLRequestContext } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginUsageReportingDisabled } from '@apollo/server/plugin/disabled';
import responseCachePlugin from '@apollo/server-plugin-response-cache';

import { errorHandler, defaultPlugins } from '@pocket-tools/apollo-utils';

import { IPublicContext } from './context';
import { schema } from './schema';

// export const server = new ApolloServer({
export function getPublicServer(
  httpServer: Server,
): ApolloServer<IPublicContext> {
  const plugins = [
    // sentryPlugin,
    // ApolloServerPluginDrainHttpServer({ httpServer }),
    // // All our subgraphs are behind a VPC and a VPN so its safe to enable the Landing Page
    // ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    // // Enable the ftv trace in our response which will be used by the gateway, and ensure we include errors so we can see them in apollo studio.
    // ApolloServerPluginInlineTrace({ includeErrors: { unmodified: true } }),
    // // Disable Usage reporting on all subgraphs in all environments because our gateway/router will be the one reporting that.
    // ApolloServerPluginUsageReportingDisabled(),
    ...defaultPlugins(httpServer),
    responseCachePlugin({
      // https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
      // The user id is added to the request header by the apollo gateway (client api)
      sessionId: async (
        requestContext: GraphQLRequestContext<IPublicContext>,
      ) =>
        requestContext?.request?.http?.headers?.has('userId')
          ? requestContext?.request?.http?.headers?.get('userId')
          : null,
    }),
  ];

  return new ApolloServer<IPublicContext>({
    schema,
    plugins,
    introspection: true,
    formatError: errorHandler,
  });
}

export async function startPublicServer(
  httpServer: Server,
): Promise<ApolloServer<IPublicContext>> {
  const server = getPublicServer(httpServer);
  await server.start();
  return server;
}
