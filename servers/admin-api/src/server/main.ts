import { ApolloServer } from 'apollo-server-express';
import config from '../config';
import AWSXRay from 'aws-xray-sdk-core';
import xrayExpress from 'aws-xray-sdk-express';
import express from 'express';
import https from 'https';
import { contextFactory } from './context';
import { getAppGateway } from './gateway';
import * as Sentry from '@sentry/node';
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import { sentryPlugin } from '@pocket-tools/apollo-utils';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';

//Set XRAY to just log if the context is missing instead of a runtime error
AWSXRay.setContextMissingStrategy('LOG_ERROR');

//Add the AWS XRAY ECS plugin that will add ecs specific data to the trace
AWSXRay.config([AWSXRay.plugins.ECSPlugin]);

//Capture all https traffic this service sends
//This is to auto capture node fetch requests (like to parser)
//The second parameter is to enable downstream xray calls
AWSXRay.captureHTTPsGlobal(https, true);

//Capture all promises that we make
AWSXRay.capturePromise();

Sentry.init({
  ...config.sentry,
  debug: config.sentry.environment == 'development',
});

async function startServer() {
  const server = new ApolloServer({
    gateway: getAppGateway(),
    debug: process.env.NODE_ENV !== 'production',
    // Enable schema introspection so that GraphQL Codegen can generate types
    // that are used by Apollo Client in frontend apps
    introspection: true,
    context: contextFactory,
    plugins: [
      sentryPlugin,
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageGraphQLPlayground(),
      // Set a default cache control of 5 seconds so it will send cache headers.
      // Individual schemas can define headers on directives that the Gateway will then merge
      ApolloServerPluginCacheControl({
        defaultMaxAge: config.apollo.defaultMaxAge,
      }),
    ],
    // enable cross-site request forgery protection
    csrfPrevention: true,
  });
  await server.start();
  return server;
}

const server = startServer();
// Pass the ApolloGateway to the ApolloServer constructor

const app = express();

// enable file uploads!
app.use(
  graphqlUploadExpress({
    maxFileSize: config.app.upload.maxSize,
    maxFiles: config.app.upload.maxFiles,
  }),
);

//If there is no host header (really there always should be..) then use admin-api as the name
app.use(xrayExpress.openSegment('admin-api'));

//Set XRay to use the host header to open its segment name.
AWSXRay.middleware.enableDynamicNaming('*');

//Apply the GraphQL middleware into the express app
server.then((server) => server.applyMiddleware({ app, path: '/' }));

//Make sure the express app has the xray close segment handler
app.use(xrayExpress.closeSegment());

export default app;
