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
docker-compose up --wait
pnpm dev
```
This will spin up dependent docker services (detached mode), and run the node ts services.

To spin up a service individually:
```
cd content-monorepo
docker-compose up --wait
cd servers/server1
npm run dev
```

## DynamoDB
Prospect-api uses `dynamodb` as the db system. When running `docker compose up`, the `localstack` container executes a `dynamodb.sh` script where the prospect-api table
is created. 
To seed the table with data, run the seeding script:
``` 
cd content-monorepo
pnpm db:dynamo-seed
```  

## Prisma
Collection-api & curated-corput-api use `prisma` as their ORM, and to setup & seed the tables, some tasks need to be run separately from `docker compose`.

### Generate Prisma Typescript Types
```
cd content-monorepo
pnpm db:generate-prisma-client
```

### Resetting & Seeding the Databases
Make sure the `.env` under each service using `prisma` contains the appropriate `DATABSE_URL`.
For `curated-corpus-api`: `DATABASE_URL=mysql://root:@localhost:3306/curation_corpus?connect_timeout=300`

Run:
```
cd content-monorepo
pnpm prisma db seed
```

### Applying migration
Please refer to the specific README of the service for applying a prisma migration.