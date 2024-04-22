import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import {
  clearDb,
  createRejectedCuratedCorpusItemHelper,
} from '../../../../test/helpers';
import {
  ACCESS_DENIED_ERROR,
  MozillaAccessGroup,
} from '../../../../shared/types';
import { GET_REJECTED_ITEMS } from '../sample-queries.gql';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: RejectedCorpusItem (authentication)', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);

    // seed data
    for (const item of rejectedCorpusItems) {
      await createRejectedCuratedCorpusItemHelper(db, item);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  // A few sample Rejected Corpus items - we don't need a lot of these
  // for auth checks
  const rejectedCorpusItems = [
    {
      title: '10 Unforgivable Sins Of PHP',
    },
    {
      title: 'Take The Stress Out Of PHP',
    },
    {
      title: 'The Untold Secret To Mastering PHP In Just 3 Days',
    },
    {
      title: 'You Can Thank Us Later - 3 Reasons To Stop Thinking About PHP',
    },
  ];

  let headers: {
    name: string | undefined;
    username: string | undefined;
    groups: string | undefined;
  } = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: undefined,
  };

  describe('getRejectedCorpusItem query', () => {
    it('should get all items when user has read-only access', async () => {
      // Set up auth headers with read-only access
      headers = {
        ...headers,
        groups: `this,that,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_REJECTED_ITEMS) });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // should return all four items - the entire corpus should be accessible
      expect(result.body.data?.getRejectedCorpusItems.edges).toHaveLength(4);
    });

    it('should get all items when user has only one scheduled surface access', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      headers = {
        ...headers,
        groups: `this,that,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_REJECTED_ITEMS) });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // should return all four items - the entire corpus should be accessible
      expect(result.body.data?.getRejectedCorpusItems.edges).toHaveLength(4);
    });

    it('should throw an error when user does not have the required access', async () => {
      // Set up auth headers with no valid access group
      headers = {
        ...headers,
        groups: `this,that`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_REJECTED_ITEMS) });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is the access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });

    it('should throw an error when request access groups are undefined', async () => {
      // Set up auth headers with no access groups whatsoever (the default
      // on top of the `describe()` block for Rejected Item queries).

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_REJECTED_ITEMS) });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is the access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED',
      );
    });
  });
});
