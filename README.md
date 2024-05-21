# Content-Monorepo

This repo contains Content owned TS microservices structured in a monorepo.

Some of the patterns such as docker & circleCI have been adopted from [Pocket's Monorepo](https://github.com/Pocket/pocket-monorepo)
setup by Daniel & Kat.

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
	.circleci /
		all shared jobs + specific configs per service
	infrastructure /
		infra per service
	.docker /
		shared resources here
	apps /
		front-end apps go here
	servers /
		back-end services go here
	packages
		internal packages shared between services
	lambdas
		service AWS lambdas go here
```

Purpose of some important files in the root of the monorepo:
`.npmrc` - pnpm configuration
`pnpm-workspace.yml` - Defines the root of the `pnpm` workspace and enables to include / exclude directories from the workspace
`pnpm-lock.yml` - Lock file generated by the `pnpm` package manager contains a complete, resolved list of all dependencies and their versions.
`turbo.json` - Configure behavior for `turbo`

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

To run all integration tests:

```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm dev # this ensures prisma migrations have run
pnpm test-integrations
```

To run integration tests for a specific service:

```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm dev # this ensures prisma migrations have run
pnpm test-integrations --filter=curated-corpus-api
```

## Tracing

### Quick Definitions

Taken form the [Open Telemetry website](https://opentelemetry.io/docs/concepts/signals/traces/):

> Traces give us the big picture of what happens when a request is made to an application. Whether your application is a monolith with a single database or a sophisticated mesh of services, traces are essential to understanding the full “path” a request takes in your application.

> A span represents a unit of work or operation. Spans are the building blocks of Traces. In OpenTelemetry, they include the following information:
> Name, Parent span ID (empty for root spans), Start and End Timestamps, Span Context, Attributes, Span Events, Span Links, Span Status

Tracing is performed using the `@pocket-tools/tracing` package, which under the hood uses the `@opentelemetry/sdk-node` package and follows the
[Open Telemetry](https://opentelemetry.io/) standard. We use AWS X-Ray as our Open Telemetry ingestor and viewer in production.

### Notable Configurations

- The Open Telemetry collector is set to sample 20% of available traces. This can be adjusted in the config sent to the `nodeSDKBuilder` function
  call in each implementing service.

### Services Being Traced

(While tracing implementation is in progress, this will be a list of services that _are_ tracing.)

- Curated Corpus API
- Collection API
- Prospect API

### Local Tracing

Locally, the Open Telemetry Docker image is used instead of AWS-X Ray. (The collector and viewer of telemetry data are essentially arbitrary.)
To view traces while running services locally, you can tail the logs from the Open Telemetry Docker container:

`docker compose logs -f otlpcollector`

This will output raw telemetry data to the console. Note - by default, the Open Telemetry container will only capture `error` level traces. If you
want to inspect more data, you can change the container image `command` value from `error` to `debug` in our `docker-compose.yml` file:

`'--set=service.telemetry.logs.level=debug'`

(A potential improvement - a lightweight Open Telemetry viewer such as [Grafana](https://grafana.com/blog/2024/03/13/an-opentelemetry-backend-in-a-docker-image-introducing-grafana/otel-lgtm/).)

### Cloud Tracing (Dev & Prod)

#### Exploring Traces

- Log in to AWS and navigate to CloudWatch
- Click "Traces" in the left hand menu
- Refine the query by "Node" and enter the url of one of our services (e.g. `curated-corpus-api.getpocket.dev`)
  - You may need to refine the time period at the top of the page to get results
- Scroll to the bottom of the page and click any trace ID
- Click around on the map and the different spans displayed, checking the flyout right hand menu details menu for each.

### Viewing Specific Error Traces

To view the trace of an error logged to Sentry:

- Navigate to the error in Sentry
- Expand the "Headers" section and find the `X-Amzn-Trace-Id` key
- Copy the `Root` trace ID
- Navigate to AWS CloudWatch
- Click "Traces" in the left hand menu
- Find the very obscure "You can also type a trace ID here" link in the top right of the page
- Paste the trace ID you copied from Sentry in the modal form and click the "Go to trace details" button

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
Then rebuild from the root of the monorepo with `pnpm`

```
pnpm update
pnpm build
```

#### aws-sdk versions

⚠ Keep aws-sdk versions in sync, because AWS sometimes introduces incompatibilities without notice.

- When adding a new aws-sdk, pin it to the version used throughout the monorepo.
- When upgrading aws-sdk, upgrade it consistently throughout the monorepo.
