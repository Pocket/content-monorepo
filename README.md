# Content-Monorepo

This repo contains Content owned TS microservices structured in a monorepo.

Some of the patterns such as Docker & Github Actions have been adopted from [Pocket's Monorepo](https://github.com/Pocket/pocket-monorepo) setup by Daniel & Kat.

## Technology Used

- [Turborepo](https://turbo.build/) for build manager
- [pnpm](https://pnpm.io/) for package manager
- Docker for running dependent services
- Node TS services run with `pnpm`/`turbo`
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## Monorepo Structure

The following is an outline of how the monorepo is structured:

```
monorepo /
	.docker /
		shared resources here
	.github /
		CI workflows for all services and packages
	infrastructure /
		infra code per service
	apps /
		TBD (front-end apps go here?)
	lambdas
		service AWS lambdas go here
	packages
		internal packages shared between services
	servers /
		back-end services go here
```

Purpose of some important files in the root of the monorepo:
`.npmrc` - pnpm configuration
`.syncpackrc` - configuration for keeping dependencies in sync across all `package.json` files
`pnpm-workspace.yml` - Defines the root of the `pnpm` workspace and enables to include / exclude directories from the workspace
`pnpm-lock.yml` - Lock file generated by the `pnpm` package manager contains a complete, resolved list of all dependencies and their versions.
`turbo.json` - Configure behavior for `turbo`

## CI & CD

We use Github Actions to:

- Build Docker images
- Push Docker images to AWS ECR. For `main`/`dev` pushes, also push the image to AWS ECS.
- Execute unit and integration tests for all pull requests
  - The integration tests in Github use the same `docker-compose.yml` file that is used locally.
- Build, plan (for pull requests), and apply (for `main`/`dev` pushes) terraform
- Perform Apollo schema checks and updates
- Notify Sentry of new releases for `main`/`dev` pushes.
- Start AWS CodeDeploy for pushes to `main` and `dev`.

**Note** - We currently are _not_ queueing deployments. While a deployment is in progress, any new deployments will fail.
This is a point of reslience we should build.

### Monitoring Deployments

Build and deployment progress can be monitored in the "Actions" tab in the Github Repository.

CodeDeploy progress can be monitored directly in AWS.

## Build

First, create a local `.env` file and copy the contents of `example.env`.
Don't forget to use the `node` version configured for this monorepo (`v20`).

To build all services:

```
cd content-monorepo
nvm use
pnpm install
pnpm build
```

Sample build output:

```
 Tasks:    8 successful, 8 total
Cached:    8 cached, 8 total
  Time:    416ms >>> FULL TURBO
```

If there are no changes to the services, `turbo` uses the cached results of the previous build.

## Dev / Local Testing

To spin up all services from the root of the monorepo:

```
cd content-monorepo
docker compose up --wait
pnpm dev
```

This will spin up dependent docker services (detached mode), and run the node ts services.

To spin up a service individually, pass the `--filter={service_name}` to the `pnpm` command:

```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm dev --filter=prospect-api
```

Note that the GraphQL endpoints can be reached on the ip:port shown at startup. For example, `curated-corpus-api` can be reached at:
http://127.0.0.1:4025
http://127.0.0.1:4025/admin

### Unit Tests

To run all unit tests for all services & packages:

```
cd content-monorepo
pnpm build
pnpm test
```

To run unit tests individually per service:

```
cd content-monorepo
pnpm build
pnpm test --filter=prospect-api
```

### Integration Tests

While it is possible to run all integration tests at the same time, this isn't
advised as you'll likely get errors related to Snowplow. This is because
the integration tests will run concurrently, and all hit the same Snowplow endpoint.
This means there will likely be collisions between tests, resulting in unexpected data/failures.

If you are undeterred and want to run all integration tests at the same time:

```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm test-integrations
```

To run integration tests for a specific service:

```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm test-integrations --filter=curated-corpus-api
```

### Debugging Tests in VSCode

To enable step-through debugging in VSCode:

1. Install the [Jest Runner](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) extension. (Be sure it's this one! There are a couple other extensions with almost the same name.)
2. Open up your settings and search for `jest-runner`.
3. In the "Jest-Runner Config" section, make sure the "Jestrunner: Config Path" setting is empty. (It's probably got a default value.)
4. Open up a test file and click the `Run` and `Debug` commands that float above the test definition. It should work!

If you have trouble with any of the steps above, try re-starting VSCode.

## DynamoDB

Prospect-api uses `dynamodb` as the db system. When running `docker compose up`, the `localstack` container executes a `dynamodb.sh` script where the prospect-api table
is created.
To seed the table with data, run the seeding script:

```
cd content-monorepo
pnpm build
pnpm db:dynamo-seed
```

If you want to delete dynamodb database, restart the docker and re-run the seed

```
docker restart content-monorepo-localstack-1
```

## Prisma

Collection API & Curated Corpus API use `prisma` as their ORM, and to set up & seed the tables, some tasks need to be run separately from `docker compose`.

### Generate Prisma Typescript Types

```
cd content-monorepo
pnpm db:generate-prisma-client
```

### Resetting & Seeding the Databases

Make sure the `.env` under each service using `prisma` contains the appropriate `DATABASE_URL`.

For `curated-corpus-api`: `DATABASE_URL=mysql://root:@localhost:3306/curation_corpus?connect_timeout=300`

For `collection-api`: `DATABASE_URL=mysql://root:@localhost:3306/collections?connect_timeout=300`

Run:

```
cd content-monorepo
pnpm prisma db seed
```

### Applying migration

Please refer to the specific README of the service for applying a prisma migration.

### Adding a new dependency via pnpm

Navigate to the individual project and use `npm install` to update the item
Then rebuild from the root of the monorepo with `pnpm`:

```
pnpm update
pnpm build
```

## Package Synchronization

We use [Syncpack](https://jamiemason.github.io/syncpack/guide/getting-started/) to keep package versions consistent across servers, lambdas, and shared packages. Outside of the consistent functional expecations of using the same package version in all places, it's important to keep some package groups in sync to mitigate cross-package bugs, e.g AWS and Prisma packages.

The syncpack config can be found in the `./syncpackrc` file.

There are two command line operations associated with Syncpack:

1. `pnpm list-mismatches` will tell you if any packages are out of sync/in violation of the rules set in `.syncpackrc`. This should only happen if your current branch is changing packages/package versions. Our CI will error if the rules in `.syncpackrc` are in violation.

2. `pnpm fix-mismatches` will automatically fix `package.json` files that are in violation of the rules set in `.syncpackrc` by changing package versions. This is a quick and easy way to perform an upgrade, but as with any operation that can change things at scale, be sure you check the result is what you expect.

## Tracing (Servers Only - WIP)

We leverage [Pocket's tracing package](https://www.npmjs.com/package/@pocket-tools/tracing) to perform traces in our `server` applications:

- Collection API

  - [GCP Traces](<https://console.cloud.google.com/traces/list?project=moz-fx-pocket-prod-61fb&pageState=(%22traceIntervalPicker%22:(%22groupValue%22:%22P7D%22,%22customValue%22:null),%22traceFilter%22:(%22chips%22:%22%255B%257B_22k_22_3A_22service.name_22_2C_22t_22_3A10_2C_22v_22_3A_22_5C_22collection-api_5C_22_22_2C_22s_22_3Atrue_2C_22i_22_3A_22service.name_22%257D%255D%22))>)
  - [GCP Logs](https://cloudlogging.app.goo.gl/3Ft9tbRDo3cHfC9K7)
  - [Unleash feature flag](https://featureflags.getpocket.dev/projects/default/features/perm.content.tracing.collections) (Dev)
  - [Unleash feature flag](https://featureflags.readitlater.com/projects/default/features/perm.content.tracing.collections) (Prod)

- Curated Corpus API (coming soon)
- Prospect API (coming soon)

Tracing is performed using Open Telemetry NPM packages that send trace data to a standalone collector ECS service in AWS, which in turn exports trace data to GCP. The Pocket tracing package also implements an
[Open Telemetry package](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) that hooks into the Winston logger (which we implement via the Pocket `ts-logger` package) to auto-forward log data to GCP.

### Enable/Disable Tracing in Prod & Dev

Tracing can be enabled and disabled using an Unleash feature flag, which exists per service implementing tracing.

To enable and configure the feature flag:

1. Visit the feature flag URL for the environment in question (linked above)
2. Toggle the `default` environment to "On" in the left hand "Enabled in environments" box
3. Expand the `default` environment in the main, right-hand panel
4. Click the ✎ pencil icon to edit the "Gradual rollout" strategy
5. Move the "Rollout" slider to 100%
6. Click the "Variants" tab and adjust the "Payload" number to the sample rate you'd like for your traces
   - In production, this should usually be 1% (0.01) to begin with, and can be increased slowly if needed
7. Click "Save strategy"
8. After some requests have been made to the service, go look at traces in GCP (using links above)

To disable tracing on a service, simply toggle the `default` environment to "Off".

### Local Tracing

Local tracing is enabled by default and sends trace data to a Grafana Docker image. To view traces locally:

1. Make sure the local service you want to trace has activity, e.g. by running a query in the Apollo Server Playground
2. Navigate to the Grafana docker image endpoint at `http://localhost:3000/explore`
3. Click "Explore" in the left hand menu
4. In the dropdown at the top left of the middle pane, select "Tempo"
5. In the main panel, select the "Service Graph" for "Query type"
6. Click the service you want to view traces for and select "View traces"
7. Trace away!

## CI Status

### Servers

[![Collection API](https://github.com/Pocket/content-monorepo/actions/workflows/collection-api.yml/badge.svg)](https://github.com/Pocket/content-monorepo/actions/workflows/collection-api.yml)  
[![Curated Corpus API](https://github.com/Pocket/content-monorepo/actions/workflows/curated-corpus-api.yml/badge.svg)](https://github.com/Pocket/content-monorepo/actions/workflows/curated-corpus-api.yml)  
[![Prospect API](https://github.com/Pocket/content-monorepo/actions/workflows/prospect-api.yml/badge.svg)](https://github.com/Pocket/content-monorepo/actions/workflows/prospect-api.yml)

### Lambdas

[![Prospect Translation Lambda](https://github.com/Pocket/content-monorepo/actions/workflows/prospect-translation-lambda.yml/badge.svg)](https://github.com/Pocket/content-monorepo/actions/workflows/prospect-translation-lambda.yml)  
[![Corpus Scheduler Lambda](https://github.com/Pocket/content-monorepo/actions/workflows/corpus-scheduler-lambda.yml/badge.svg)](https://github.com/Pocket/content-monorepo/actions/workflows/corpus-scheduler-lambda.yml)
