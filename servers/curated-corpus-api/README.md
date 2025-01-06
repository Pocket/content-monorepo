# Curated Corpus API

The Curated Corpus API serves three primary functions:

1. Allow our editorial team to manage both an approved corpus and a rejected corpus.
2. Allow our editorial team to schedule approved corpus items across a number of Scheduled Surfaces (e.g. en-US Firefox New Tab).
3. Allow the ML team access to approved corpus items for eventual display on Pocket surfaces.

The corpus is managed by editors through our [curation admin tools](https://github.com/Pocket/curation-admin-tools). These tools allow editors to customize meta information about approved items - title, excerpt, image, etc. The approved corpus is the authoritative source for this meta information (_not_ the [Parser](https://github.com/Pocket/Parser)).

In its current form, approved items come primarily from ML prospecting jobs - though editors have final say on which prospects are approved. Items can also be manually added to the approved corpus by editors.

Items in the approved corpus are available to be recommended across Pocket surfaces. Items in the rejected corpus will be prevented from ever displaying on Pocket surfaces.

## Application Overview

This app is a GraphQL API written in TypeScript. To serve the API, the following packages are used:

- [Express](https://expressjs.com/) and [Apollo Server](https://www.apollographql.com/docs/apollo-server/),
- [Prisma](https://www.prisma.io/) as an ORM to a MySQL relational database,
- [prisma-relay-cursor-connection](https://github.com/devoxa/prisma-relay-cursor-connection) for Relay-style pagination,
- S3 for image storage,
- [Jest](https://jestjs.io/) and [Chai](https://www.chaijs.com/) for integration and unit testing.

### GraphQL Schemas

This application has two GraphQL schemas - one public for clients (Web, Android, iOS) and one private for the [admin tools](https://github.com/Pocket/curation-admin-tools). As these schemas share data, we have created three schema files:

- `./schema-shared.graphql`
- `./schema-public.graphql`
- `./schema-admin.graphql`

`schema-shared.graphql` is stitched onto the other schemas in `src/typeDefs.ts`.

Having two schemas means we need two GraphQL endpoints, meaning two Apollo Servers. These servers are located in `src/admin/server.ts` and `src/public/server.ts`. In `src/main.ts`, we add both Apollo Servers to Express.

### Pagination

This API implements [Relay-style pagination](https://relay.dev/graphql/connections.htm) with the assistance of the [prisma-relay-cursor-connection](https://github.com/devoxa/prisma-relay-cursor-connection) package.

It is important that the `PageInfo` type and the `PaginationInput` in the shared GraphQL schema do not deviate from implementations in our other federated APIs. In other words, please leave them exactly as they were initially implemented (this includes accompanying comments) to avoid schema composition errors.

As specified in the `prisma-relay-cursor-connection` documentation, the following combinations of `PaginationInput` variables are supported:

- `{}` All resources (no pagination variables specified in the query at all)
- `{ first: number }` The first X resources
- `{ first: number, after: string }` The first X resources after the cursor Y
- `{ last: number }` The last X resources
- `{ last: number, before: string }` The last X resources before the cursor Y

GraphQL will throw an error if an unsupported combination of variables is used in the paginated query.

## Local Development

### Initial Setup

Please refer to the main README in this monorepo.

Once the project is up and running, you should be able to reach

- the public API at `http://localhost:4025/`
- the admin API at `http://localhost:4025/admin`

To run Prisma commands, you will need to create an `.env` file and add a variable for the database connection:

```dotenv
DATABASE_URL=mysql://root:@mysql:3306/curation_corpus?connect_timeout=300
```

All the Prisma commands need to be run from the `servers/curated-corpus-api` directory.

Out of the box, the local installation doesn't have any actual data for you to fetch or manipulate through the API. To seed some sample data for your local dev environment, run

```bash
npx prisma migrate reset
```

Note that the above command will not be adding to any data you may have added to the database through other means - it will do a complete reset AND apply the seed script located at `src/prisma/seed.ts`.

### Admin API Authorization

The admin API requires HTTP headers be set to authorize operations (both queries and mutations). The public API does not require any authorization.

To run queries _against the `/admin` API_ in the GraphQL playground, you'll need to specify some HTTP headers. To do so:

1. Open up the GraphQL playground at `http://localhost:4025` and make sure your playground tab's address is `http://localhost:4025/admin`.
2. Click the **HTTP HEADERS** link at the bottom of the left hand side of the playground to reveal a text box.
3. Enter the necessary headers (see sample below) into the box and try an operation - it should work!

The sample headers below allow full access to all queries and mutations:

```typescript
{
  "groups": "mozilliansorg_pocket_scheduled_surface_curator_full",
  "name": "Cherry Glazer",
  "username": "ad|Mozilla-LDAP|cglazer"
}
```

Note that the `groups` header can contain mulitple values separated by commas (but still in a single string).

If you'd like to experiment with different levels of authorization (e.g. access to only one scheduled surface), you can find the full list of Mozillian groups on our [Shared Data document](https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data#Source-of-Truth.3).

## Testing

So far we only have integration tests in this repository, and these wipe the database on each run, which means it's ~really tricky~ impossible as yet to have them running in the background in watch mode while you code.

Please refer to the main README for instructions on running the tests for this service.

## Making changes to the Prisma schema

If you need to change the Prisma schema (in `prisma/schema.prisma`), you'll need to create a migration to ensure the database is in sync. After you have made your changes to `schema.prisma`, run

```bash
npx prisma migrate dev --name some_meaningful_migration_name
```

This will create a migration script in `prisma/migrations` and will automatically run the new migration. This will also re-create your Prisma Typescript types.

## Testing on Dev

### Deploying to Dev

The Dev checkout is available at [https://curated-corpus-api.getpocket.dev/](https://curated-corpus-api.getpocket.dev/).

To deploy the latest changes merged to main to Dev, run the following command in your terminal:

```bash
git push -f origin main:dev
```

To push changes from a particular branch to Dev, use the name of the branch instead of main:

```bash
git push -f origin your-branch-name:dev
```

### Resetting Dev

There may come a time when you need to reset the Dev environment. For example, if you were testing a schema change and then want to test a different branch _without_ that schema change, the dev database and Prisma schema will be out of sync.
Another common scenario is the need to reset all test data to the initial seed data provided by the seed script.

To reset the Dev database, [follow the instructions in Confluence](https://mozilla-hub.atlassian.net/wiki/spaces/PE/pages/390673411/Resetting+Data+for+a+Prisma-based+Subgraph+on+Dev).
