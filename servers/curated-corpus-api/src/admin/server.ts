import { Server } from 'http';

import {
  ApolloServer,
  ApolloServerPlugin,
  GraphQLRequestContext,
} from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginUsageReportingDisabled } from '@apollo/server/plugin/disabled';
import responseCachePlugin from '@apollo/server-plugin-response-cache';

import { errorHandler, sentryPlugin } from '@pocket-tools/apollo-utils';

import { IAdminContext } from './context';
import { schema } from './schema';

/**
 * Sets up and configures an ApolloServer for the application.
 * @param contextFactory function for creating the context with
 * every request
 * @returns ApolloServer
 */
export function getAdminServer(
  httpServer: Server,
): ApolloServer<IAdminContext> {
  const plugins = [
    // apollo-utils 3.x is typed against AS4 (only HeaderMap differs); drop the cast with apollo-utils 4 (HNT-3505).
    sentryPlugin as unknown as ApolloServerPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // All our subgraphs are behind a VPC and a VPN so its safe to enable the Landing Page
    ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    // Enable the ftv trace in our response which will be used by the gateway, and ensure we include errors so we can see them in apollo studio.
    ApolloServerPluginInlineTrace({ includeErrors: { unmodified: true } }),
    // Disable Usage reporting on all subgraphs in all environments because our gateway/router will be the one reporting that.
    ApolloServerPluginUsageReportingDisabled(),
    responseCachePlugin({
      // https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
      // The user id is added to the request header by the apollo gateway (client api)
      sessionId: async (
        requestContext: GraphQLRequestContext<IAdminContext>,
      ) =>
        requestContext?.request?.http?.headers?.has('userId')
          ? requestContext?.request?.http?.headers?.get('userId')
          : null,
    }),
  ];

  return new ApolloServer<IAdminContext>({
    schema,
    plugins,
    introspection: true,
    formatError: errorHandler,
    // Keep AS4's 200 for variable coercion errors (custom Date/NonNegativeInt scalars); a 400 makes the admin-api gateway replace BAD_USER_INPUT with "400: Bad Request".
    status400ForVariableCoercionErrors: false,
  });
}

/**
 * Create and start the apollo server. Required to await server.start()
 * before applying middleware.
 */
export async function startAdminServer(
  httpServer: Server,
): Promise<ApolloServer<IAdminContext>> {
  const server = getAdminServer(httpServer);
  await server.start();
  return server;
}
