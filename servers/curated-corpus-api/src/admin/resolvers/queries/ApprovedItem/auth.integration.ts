import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import { ApprovedItem } from '.prisma/client';
import { CuratedStatus } from 'content-common';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { MozillaAccessGroup } from 'content-common';
import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import {
  GET_APPROVED_ITEMS,
  GET_APPROVED_ITEM_BY_URL,
  GET_APPROVED_ITEM_BY_EXTERNAL_ID,
} from '../sample-queries.gql';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: approvedCorpusItem - authentication', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  // Save the sample items in a variable so that we can access their
  // auto-generated props such as `externalId` in tests
  const items: ApprovedItem[] = [];

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);

    // seed data
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
    ];

    // insert test stories into the db
    for (const story of stories) {
      const item = await createApprovedItemHelper(db, story);
      items.push(item);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  describe('getApprovedCorpusItems query', () => {
    it('should get all items when user has read-only access', async () => {
      // Set up auth headers with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_APPROVED_ITEMS) });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // should return all 3 items
      expect(result.body.data?.getApprovedCorpusItems.edges).toHaveLength(3);
    });

    it('should get all items when user has only one scheduled surface access', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_APPROVED_ITEMS) });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // should return all 3 items
      expect(result.body.data?.getApprovedCorpusItems.edges).toHaveLength(3);
    });

    it('should throw an error when user does not have the required access', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_APPROVED_ITEMS) });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });

    it('should throw an error when request header groups are undefined', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // groups explicitly omitted
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_APPROVED_ITEMS) });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });
  });

  describe('getApprovedCorpusItemByUrl query', () => {
    it('should get item when user has read-only access', async () => {
      // Set up auth headers with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_URL),
          variables: {
            url: 'https://www.test.com/story-two',
          },
        });

      expect(result.body.data).not.toBeNull();
      expect(result.body.errors).toBeUndefined();
    });

    it('should get item when user has only one scheduled surface access', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_URL),
          variables: {
            url: 'https://www.test.com/story-two',
          },
        });

      expect(result.body.data).not.toBeNull();
      expect(result.body.errors).toBeUndefined();
    });

    it('should throw an error when user does not have the required access', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_URL),
          variables: {
            url: 'https://www.test.com/story-two',
          },
        });

      expect(result.body.data?.getApprovedCorpusItemByUrl).toBeNull();

      expect(result.body.errors).not.toBeUndefined();
      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });

    it('should throw an error when request header groups are undefined', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // groups explicitly omitted
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_URL),
          variables: {
            url: 'https://www.test.com/story-two',
          },
        });

      expect(result.body.data?.getApprovedCorpusItemByUrl).toBeNull();

      expect(result.body.errors).not.toBeUndefined();
      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });
  });

  describe('approvedCorpusItem query', () => {
    it('should get item when user has read-only access', async () => {
      // Set up auth headers with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
          variables: {
            externalId: items[0].externalId,
          },
        });

      expect(result.body.data).not.toBeNull();
      expect(result.body.errors).toBeUndefined();
    });

    it('should get item when user has only one scheduled surface access', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
          variables: {
            externalId: items[1].externalId,
          },
        });

      expect(result.body.data).not.toBeNull();
      expect(result.body.errors).toBeUndefined();
    });

    it('should throw an error when user does not have the required access', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
          variables: {
            externalId: items[2].externalId,
          },
        });

      expect(result.body.data?.approvedCorpusItemByExternalId).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });

    it('should throw an error when request header groups are undefined', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // groups explicitly omitted
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
          variables: {
            externalId: items[0].externalId,
          },
        });

      expect(result.body.data?.approvedCorpusItemByExternalId).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });
  });
});
