# Content-Monorepo  
This repo contains Content owned TS microservices structured in a monorepo.  

Some of the patterns such as docker & circleCI have been adopted from [Pocket's Monorepo](https://github.com/Pocket/pocket-monorepo)
setup by Daniel & Kat.
  
## Technology Used
  
- [Turborepo](https://turbo.build/)  for build manager  
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
	lambas
		service AWS lambdas go here
```
Purpose of some important files in the root of the monorepo:
	`.npmrc` - pnpm configuration
	`pnpm-workspace.yml` - Defines the root of the `pnpm` workspace and enables to include / exclude directories from the workspace
	`pnpm-lock.yml` - Lock file generated by the `pnpm` package manager contains a complete, resolved list of all dependencies and their versions.
	`turbo.json` - Configure behavior for `turbo`

## Build
First, create a local `.env` file and copy the contents of `example.env`.
Don't forget to use the `node` version configured for this monorepo (`v18`).

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

Note the GraphQL endpoints can be reached on the ip:port shown at startup.  Each schema can be accessed by add a suffix like:
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
pnpm test-integrations
```

To run integration tests for a specific service:
```
cd content-monorepo
docker compose up --wait
pnpm build
pnpm test-integrations --filter=prospect-api
```

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
Collection-api & curated-corput-api use `prisma` as their ORM, and to setup & seed the tables, some tasks need to be run separately from `docker compose`.

### Generate Prisma Typescript Types
```
cd content-monorepo
pnpm db:generate-prisma-client
```

### Resetting & Seeding the Databases
Make sure the `.env` under each service using `prisma` contains the appropriate `DATABASE_URL`.

For `curated-corpus-api`: `DATABASE_URL=mysql://root:@localhost:3306/curation_corpus?connect_timeout=300`

Run:
```
cd content-monorepo
pnpm prisma db seed
```

### Applying migration
Please refer to the specific README of the service for applying a prisma migration.


### Adding a new depenency via pnpm
Navigate to the individual project and use `npm install` to update the item
Then rebuld the npmp top level 
```
npm update
npm build
```
