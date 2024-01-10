*Note: README needs some updated as service is migrated to monorepo*
# Prospect API

This repo contains two distinct but related applications: an API and a Lambda.

The API is used by our curation admin tools to retrieve ML generated prospects for curator review.

The Lambda processes ML prospects from an SQS queue and inserts them into a DynamoDB table. This DynamoDB table is the data source for the API.

These two distinct applications share code - specifically DynamoDB interactions, TypeScript types, and utility functions. This shared code resides in the `prospectapi-common` folder, and is used as a local NPM package. (More details on how this package is used/installed below.)

This repo leverages [Pocket's share data structures](https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data).

## API

The API code resides in the `/src` folder.

### Application Overview

[Express](https://expressjs.com/) is the Node framework, [Apollo Server](https://www.apollographql.com/docs/apollo-server/) is used in Express to expose a GraphQL API, and data is retrieved from [DynamoDB](https://aws.amazon.com/dynamodb/) via a thin, custom wrapper around the AWS SDK.

The API provides one query to retrieve prospects (which can accept an optional set of filters), and one mutation to mark a prospect as curated (so it doesn't get sent to another curator for review).

### GraphQL Schemas

This application has a single, non-federated GraphQL schema. This schema may become federated if/when there is a more broad use case for retrieving prospects.

## Lambda

The Lambda code resides in the `/aws_lambda` folder.

### Application Overview

The Lambda is a Node application that is triggered off an SQS queue. Messages are sent to the SQS queue at regular intervals by ML Metaflow jobs (one job per `ProspectType`/`ScheduledSurface` combo). When the queue gets a message, the Lambda is executed, and performs the general steps below, in order:

1. Validate the format of the SQS message
2. Validate the format of each prospect contained in the SQS message
3. Delete all old prospects matching the `ProspectType` and `ScheduledSurface` of the current SQS message - this is how prospects are refreshed and not duplicated in DynamoDB
4. Hydrate each prospect with meta data from Client API (specifically, the Parser)
5. Insert each prospect into DynamoDB

## Common Module

The common module code is in the `prospectapi-common` folder.

### Module Overview

The shared code exists as its own NPM package to be installed and used by the API and the Lambda. The code is shared via `npm link`, which places this module in the global `npm_modules` folder (which is system dependent in location). For local development, a symlink is created in both the API and Lambda directories. Because symlinking doesn't play well out in the wild, during deployments we copy this package from the global `npm_modules` folder into the application specific `npm_modules` folder.

## Local Development

### API

Clone the repo:

- `git clone git@github.com:Pocket/prospect-api.git`
- `cd prospect-api`

Start the Docker containers:

- `docker compose up`

After Docker completes, you should be able to hit the GraphQL playground at `http://localhost:4026`.

Note the app startup command in `/docker-compose.yml`:

```bash
bash -c 'cd /app &&
cd prospectapi-common &&
npm ci &&
npm run build &&
npm link &&
cd ../aws_lambda &&
npm ci &&
npm link prospectapi-common &&
cd .. &&
npm ci &&
npm link prospectapi-common &&
npm run start:dev'
```

Using `npm link`, this "installs" the common module into the API and the Lambda.

#### Seeding Your Local Database

To seed your local DynamoDB, run the following:

`docker compose exec app npm run seed`

Note: you'll need to re-seed your database after running integration tests!

#### API Authorization

The API requires HTTP headers be set to authorize operations (both queries and mutations).

To run operations in the GraphQL playground, you'll need to specify some HTTP headers. To do so:

1. Open up the GraphQL playground at `http://localhost:4026`.
2. Click the **HTTP HEADERS** link at the bottom of the left hand side of the playground to reveal a text box.
3. Click the 'Bulk Edit' button at the bottom of the screen and paste in the text below

The sample headers below allow full access to all queries and mutations:

```
groups:mozilliansorg_pocket_scheduled_surface_curator_full
name:Cherry Glazer
username:ad|Mozilla-LDAP|cglazer
```

Note that the `groups` header can contain mulitple values separated by commas (but still in a single string).

If you'd like to experiment with different levels of authorization (e.g. access to only one scheduled surface), you can find the full list of Mozillian groups on our [Shared Data document](https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data#Source-of-Truth.3).

### Common Module

Changes made to the common module _should_ be picked up automatically via the `node_modules` symlink. Howevever, this has been spotty in practice, so if you aren't seeing a change made in the common module reflected in either the API or the Lambda, you can try the following:

1. `cd prospectapi-common`
2. make your changes
3. `npm run build`
4. `cd ../src && npm link prospectapi-common`
5. `cd ../aws_lambda && npm link prospectapi-common`

You may need to repeat the steps above every time you make changes to the common module. If you have to perform the steps above, be noisy about it in Slack. If this becomes enough of an issue, we should devote time to fixing it.

## Running Tests

We have two test commands for each component (API, Lambda, Common Module): one for unit/functional tests and one for integration tests. These are both run by [Jest](https://jestjs.io/) and are differentiated by file names. Any file ending with `.spec.ts` will be run in the unit/functional suite, while integration tests should have the `.integration.ts` suffix.

Unit/functional tests are self-contained, meaning they do not rely on any external services. Integration tests rely on MySQL and AWS (which is mocked by a [localstack](https://github.com/localstack/localstack) Docker container locally).

Test are run via `npm` commands:

- Unit/functional:

```bash
npm test
```

- Integration:

```bash
npm run test-integrations
```

As each component in this repo (API, Lambda, Common Module) have different dependencies, they need to be tested separately (otherwise the root `package.json` would need to contain dependencies for all components).

### API

To test the API, run the above commands from the project root.

### Lambda

To test the Lambda, run the above commands in the `aws_lambda` folder.

### Common Module

To test the common module, run the above commands in the `prospectapi-common` folder.
