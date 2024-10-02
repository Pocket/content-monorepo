# Admin API

The Admin API is a federated (read: combined) graph dedicated to powering internal Pocket tools - meaning any applications that are internal to pocket and not client/user facing. These applications may include admin tools, machine learning/data processes, and analytics processes.

As of March 2022, the Admin API federates the following:

- All of [Prospect API](https://github.com/Pocket/prospect-api), as there are no public endpoints.
- The admin graph of [Curated Corpus API](https://github.com/Pocket/curated-corpus-api).
- The admin graph of [Collection API](https://github.com/Pocket/collection-api/).

Due to continued dependence on our Parser service, the Admin API also federates the `parser-graphql-wrapper`. (Yes, `parser-graphql-wrapper` is a part of both our public Client API and this private Admin API. Neat!)

## <a name="starting"></a> Starting the service

Note - after starting the service, you will still need to configure JWT authentication prior to being able to execute any operations through the GraphQL playground. JWT authentication is covered in the next section.

### Initial setup - Running against dev subgraphs

- Install [docker](https://www.docker.com/) and [rover cli](https://www.apollographql.com/docs/rover/getting-started) if not already configured.
- Copy `./local-supergraph-config.sample.yaml` to `./local-supergraph-config.yaml` if you haven't already. By default this will connect you to the dev subgraphs.
- Run `npm ci` to install the project dependencies.
- Run `docker-compose up` to start the memcache container. Add the `-d` option to run the container in the background
- Connect to Pocket VPN Dev
- Run `npm run start:dev` to start the application.

### Running against local subgraphs

Eventually, you'll likely want to test against at least one local subgraph. To do so, get the subgraph(s) in question running locally (this is different for each subgraph - check those READMEs for more info). Once the subgraph is running locally, update `./local-supergraph-config.yaml` to point to the local URL of the subgraph(s) in question - local endpoints should already exist in comments in `./local-supergraph-config.sample.yaml`. (It's fine to have a mix of dev and local subgraph endpoints.) Re-start the service and you should be good to go.

If you are using _only_ local subgraphs, you do not need to be connected to Pocket VPN Dev.

### Running against prod subgraphs

It's not recommended to use production subgraphs, but if you have to, you can change the subgraph endpoints in `./local-supergraph-config.yaml` to point to production. You'll need to be on Pocket VPN Prod, and cannot use a mix of dev and prod subgraph endpoints.

## Authentication

All requests to the gateway require a valid JWT provided by our Cognito authentication service. You must pass this JWT as a header.

### Retrieving your JWT

To retrieve your current JWT:

1. Access the curation tools dev site: https://curation-admin-tools.getpocket.dev/
2. Complete the SSO login flow if asked
3. Once you are able to select a tool (e.g. Collections, Curated Corpus), open up the browser dev tools (cmd+option+i) and select the "Storage" tab
4. Expand Local Storage and find the entry for https://curation-admin-tools.getpocket.dev/
5. Select the `auth` key and find the `id_token` value - this is the JWT you need

### Passing your JWT as a header

Once you've retrieved your JWT, open up the GraphQL playground for this servce at http://localhost:4027/. At the bottom of the left-hand panel where you write queries/mutations, click on **HTTP HEADERS** and enter the following:

```
{
  "authorization": "Bearer YourVeryLongJWTGoesHere"
}
```

You should now be able to execute operations with the permissions granted to your Cognito user via Mozillian Groups. For more information on these groups, see our [Shared Data document](https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data#Authentication-%26-Authorization).

## Gotchas

- This service uses memcache to cache query and mutation responses. If you are getting the same results when you expect something else, there's a good chance that the response is cached.
  - The easiest way to get around this is to flush the cache with `echo 'flush_all' | nc localhost 11211`
  - Restarting the memcache container also works to flush the cache

## Admin API Schema/Naming Conventions

The general principles guiding these are:

- What are GraphQl's own recommendations (Looking at http://spec.graphql.org/)
- What are the industry standards or standards used by the tools we use (Such as Apollo's recommendations: https://www.apollographql.com/docs/apollo-server/schema/schema/#naming-conventions)
- What will have the best compatibility with naming conventions in languages that our primary consumers of the API (apps) will use, to reduce likelihood of them having to rename or adapt them.

### Casing

Use `PascalCase` for:

- Definition names. Such as the names of types, enums, scalars, unions etc. (except directives, see below)

Use `camelCase` for:

- Field names
- Argument names
- Query and Mutation names
- Directive names

Use `ALL_CAPS` for:

- Enum options

### Acronyms & Abbreviations

For words like URL, HTTP, HTML, etc, do not uppercase all letters, just follow casing rules above.

Some examples:

For types:

- URL would be `Url`
- HTML would be `Html`
- ArticleHTML would be `ArticleHtml`

For fields:

- URL would be `url`
- articleURL would be `articleUrl`
- itemID would be `itemId`

For enums however, everything is already capitalized:

- URL would be `URL`
- articleURL would be `ARTICLE_URL`
