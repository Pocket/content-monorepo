import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import { RejectedCuratedCorpusItem as dbRejectedCuratedCorpusItem } from '.prisma/client';
import {
  clearDb,
  createRejectedCuratedCorpusItemHelper,
} from '../../../../test/helpers';
import { GET_REJECTED_ITEMS } from '../sample-queries.gql';
import { MozillaAccessGroup } from '../../../../shared/types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: RejectedCorpusItem (getRejectedCorpusItem)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
  };

  // Fake sample Rejected Curated Corpus items
  const rejectedCuratedCorpusItems = [
    {
      title: '10 Unforgivable Sins Of PHP',
      language: 'EN',
      reason: 'fake reason',
    },
    {
      title: 'Take The Stress Out Of PHP',
      language: 'EN',
      url: 'https://www.sample-domain/take-the-stress-out-of-php',
      topic: 'Technology',
    },
    {
      title: 'The Untold Secret To Mastering PHP In Just 3 Days',
      language: 'EN',
      topic: 'Technology',
    },
    {
      title: 'You Can Thank Us Later - 3 Reasons To Stop Thinking About PHP',
      language: 'EN',
    },
    {
      title: 'Why Ignoring PHP Will Cost You Time and Sales',
      language: 'EN',
    },
    {
      title: 'PHP: This Is What Professionals Do',
      language: 'EN',
    },
    {
      title: 'All About Cake PHP',
      language: 'EN',
    },
    {
      title: "Are You Embarrassed By Your PHP Skills? Here's What To Do",
      language: 'DE',
    },
    {
      title: 'Proof That PHP Is Exactly What You Are Looking For',
      language: 'DE',
    },
    {
      title: 'Learn Laravel in 10 days',
      language: 'DE',
    },
  ];

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));

    db = client();

    await clearDb(db);

    for (const item of rejectedCuratedCorpusItems) {
      await createRejectedCuratedCorpusItemHelper(db, item);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('should get all items when number of requested items is greater than total items', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 20 },
        },
      });

    expect(data?.getRejectedCorpusItems.edges).toHaveLength(
      rejectedCuratedCorpusItems.length,
    );
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(
      rejectedCuratedCorpusItems.length,
    );
  });

  it('should correctly sort items by createdAt when using default sort', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({ query: print(GET_REJECTED_ITEMS) });

    const firstItem = data?.getRejectedCorpusItems.edges[0].node;
    const secondItem = data?.getRejectedCorpusItems.edges[1].node;

    expect(firstItem.createdAt).toBeGreaterThan(secondItem.createdAt);
  });

  it('should return all available properties of an rejected curated corpus item', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 1 },
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeUndefined();
    const firstItem: dbRejectedCuratedCorpusItem =
      result.body.data?.getRejectedCorpusItems.edges[0].node;
    // The important thing to test here is that the query returns all of these
    // properties without falling over, and not that they hold any specific value.
    expect(firstItem.externalId).toBeDefined();
    expect(firstItem.prospectId).toBeDefined();
    expect(firstItem.title).toBeDefined();
    expect(firstItem.language).toBeDefined();
    expect(firstItem.publisher).toBeDefined();
    expect(firstItem.url).toBeDefined();
    expect(firstItem.topic).toBeDefined();
    expect(firstItem.reason).toBeDefined();
    expect(firstItem.createdAt).toBeDefined();
    expect(firstItem.createdBy).toBeDefined();
  });

  it('should return correct paginated results', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 2 },
        },
      });

    // We expect to get two results back
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(2);
  });

  it('should return a PageInfo object', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 5 },
        },
      });

    const pageInfo = data?.getRejectedCorpusItems.pageInfo;
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
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 4 },
        },
      });

    const cursor = data?.getRejectedCorpusItems.edges[3].cursor;

    const {
      body: { data: nextPageData },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { first: 4, after: cursor },
        },
      });

    expect(nextPageData?.getRejectedCorpusItems.edges).not.toMatchObject({
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
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { last: 4 },
        },
      });

    const cursor = data?.getRejectedCorpusItems.edges[0].cursor;

    const {
      body: { data: prevPageData },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          pagination: { last: 4, before: cursor },
        },
      });

    expect(prevPageData?.getRejectedCorpusItems.edges).not.toMatchObject({
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
        query: print(GET_REJECTED_ITEMS),
        variables: {
          filters: { language: 'DE' },
        },
      });

    const germanItems = rejectedCuratedCorpusItems.filter(
      (item) => item.language === 'DE',
    );
    // we only have three stories in German set up before each test
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(germanItems.length);
    // make sure the total count is not _all_ results, i.e. 10, but only three
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(germanItems.length);
  });

  it('should filter by story title', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          filters: { title: 'laravel' },
        },
      });

    // we only have one story with "laravel" in the title
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(1);
  });

  it('should filter by topic', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          filters: { topic: 'Technology' },
        },
      });

    // we only have two stories categorized as "Technology"
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(2);

    // make sure total results value is correct
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(2);
  });

  it('should filter by story URL', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          filters: { url: 'sample-domain' },
        },
      });

    // expect to see just the one story with the above domain
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(1);
  });

  it('should filter url, title, topic and language', async () => {
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_REJECTED_ITEMS),
        variables: {
          filters: {
            url: 'sample-domain',
            title: 'PHP',
            topic: 'Technology',
            language: 'EN',
          },
        },
      });

    // expect to see just the one story
    expect(data?.getRejectedCorpusItems.edges).toHaveLength(1);
    // make sure total results value is correct
    expect(data?.getRejectedCorpusItems.totalCount).toEqual(1);
  });
});
