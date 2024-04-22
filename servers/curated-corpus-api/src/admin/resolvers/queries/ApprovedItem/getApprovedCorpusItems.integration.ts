import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { CuratedStatus } from 'content-common';

import { client } from '../../../../database/client';
import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import { GET_APPROVED_ITEMS } from '../sample-queries.gql';
import { MozillaAccessGroup } from '../../../../shared/types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: ApprovedCorpusItem (getApprovedCorpusItems)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;

  // adding headers with groups that grant full access
  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));

    db = client();

    await clearDb(db);

    // Create some items
    const stories = [
      {
        title: 'How To Win Friends And Influence People with GraphQL',
        language: 'EN',
        status: CuratedStatus.RECOMMENDATION,
        topic: 'FOOD',
      },
      {
        title: 'What Zombies Can Teach You About GraphQL',
        language: 'EN',
        status: CuratedStatus.RECOMMENDATION,
        url: 'https://www.sample-domain/what-zombies-can-teach-you-graphql',
        topic: 'TECHNOLOGY',
      },
      {
        title: 'How To Make Your Product Stand Out With GraphQL',
        language: 'EN',
        status: CuratedStatus.RECOMMENDATION,
        topic: 'TECHNOLOGY',
      },
      {
        title: 'How To Get Fabulous GraphQL On A Tight Budget',
        language: 'EN',
        status: CuratedStatus.RECOMMENDATION,
        topic: 'FOOD',
      },
      {
        title: 'Death, GraphQL And Taxes',
        language: 'EN',
        status: CuratedStatus.CORPUS,
        topic: 'ENTERTAINMENT',
      },
      {
        title: '22 Tips To Start Building A GraphQL You Always Wanted',
        language: 'EN',
        status: CuratedStatus.CORPUS,
        topic: 'POLITICS',
      },
      {
        title: '5 Ways You Can Get More GraphQL While Spending Less',
        language: 'EN',
        status: CuratedStatus.CORPUS,
        topic: 'POLITICS',
      },
      {
        title: "Are You Embarrassed By Your GraphQL Skills? Here's What To Do",
        language: 'DE',
        status: CuratedStatus.CORPUS,
        topic: 'FOOD',
      },
      {
        title: 'Proof That GraphQL Is Exactly What You Are Looking For',
        language: 'DE',
        status: CuratedStatus.CORPUS,
        topic: 'TRAVEL',
      },
      {
        title: 'If You Do Not Do GraphQL Now, You Will Hate Yourself Later',
        language: 'DE',
        status: CuratedStatus.CORPUS,
        topic: 'TRAVEL',
      },
    ];

    for (const story of stories) {
      await createApprovedItemHelper(db, story);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('should get all requested items', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 20 },
        },
      });

    expect(data?.getApprovedCorpusItems.edges).toHaveLength(10);
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(10);

    // Check default sorting - createdAt.DESC
    const firstItem = data?.getApprovedCorpusItems.edges[0].node;
    const secondItem = data?.getApprovedCorpusItems.edges[1].node;
    expect(firstItem.createdAt > secondItem.createdAt).toBeTruthy();
  });

  it('should get all available properties of curated items', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 1 },
        },
      });

    const firstItem = data?.getApprovedCorpusItems.edges[0].node;
    // The important thing to test here is that the query returns all of these
    // properties without falling over, and not that they hold any specific value.
    expect(firstItem.externalId).toBeDefined();
    expect(firstItem.prospectId).toBeDefined();
    expect(firstItem.title).toBeDefined();
    expect(firstItem.language).toBeDefined();
    expect(firstItem.publisher).toBeDefined();
    expect(firstItem.url).toBeDefined();
    expect(firstItem.imageUrl).toBeDefined();
    expect(firstItem.excerpt).toBeDefined();
    expect(firstItem.status).toBeDefined();
    expect(firstItem.topic).toBeDefined();
    expect(firstItem.source).toBeDefined();
    expect(typeof firstItem.isCollection).toBe('boolean');
    expect(typeof firstItem.isTimeSensitive).toBe('boolean');
    expect(typeof firstItem.isSyndicated).toBe('boolean');
    expect(firstItem.authors.length).toBeGreaterThan(0);
    expect(firstItem.authors[0].name).toBeDefined();
    expect(firstItem.authors[0].sortOrder).toBeDefined();
  });

  it('should respect pagination', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 2 },
        },
      });

    // We expect to get two results back
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(2);
  });

  it('should return a PageInfo object', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 5 },
        },
      });

    const pageInfo = data?.getApprovedCorpusItems.pageInfo;
    expect(pageInfo.hasNextPage).toEqual(true);
    expect(pageInfo.hasPreviousPage).toEqual(false);
    expect(typeof pageInfo.startCursor).toBe('string');
    expect(typeof pageInfo.endCursor).toBe('string');
  });

  it('should return after cursor without overfetching', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 4 },
        },
      });

    const cursor = data?.getApprovedCorpusItems.edges[3].cursor;

    const {
      body: { data: nextPageData },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { first: 4, after: cursor },
        },
      });

    expect(nextPageData?.getApprovedCorpusItems.edges).not.toMatchObject({
      cursor,
    });
  });

  it('should return before cursor without overfetching', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { last: 4 },
        },
      });

    const cursor = data?.getApprovedCorpusItems.edges[0].cursor;

    const {
      body: { data: prevPageData },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          pagination: { last: 4, before: cursor },
        },
      });

    expect(prevPageData?.getApprovedCorpusItems.edges).not.toMatchObject({
      cursor,
    });
  });

  it('should filter by language', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: { language: 'DE' },
        },
      });

    // we only have three stories in German set up before each test
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(3);
    // make sure the total count is not _all_ results, i.e. 10, but only three
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(3);
  });

  it('should filter by story title', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: { title: 'ZoMbIeS' },
        },
      });

    // we only have one story with "Zombies" in the title
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(1);
  });

  it('should filter by topic', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: { topic: 'TeChNoLoGy' },
        },
      });

    // we only have two stories categorised as "Technology"
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(2);

    // make sure total results value is correct
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(2);
  });

  it('should filter by curated status', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: { status: CuratedStatus.CORPUS },
        },
      });

    // expect to see six stories added to the corpus as second-tier recommendations
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(6);
    // make sure total results value is correct
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(6);
  });

  it('should filter by story URL', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: { url: 'sample-domain' },
        },
      });

    // expect to see just the one story with the above domain
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(1);
  });

  it('should filter by several parameters', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEMS),
        variables: {
          filters: {
            url: 'sample-domain',
            title: 'zombies',
            topic: 'TECHNOLOGY',
            language: 'EN',
            status: CuratedStatus.RECOMMENDATION,
          },
        },
      });

    // expect to see just the one story
    expect(data?.getApprovedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getApprovedCorpusItems.totalCount).toEqual(1);
  });
});
