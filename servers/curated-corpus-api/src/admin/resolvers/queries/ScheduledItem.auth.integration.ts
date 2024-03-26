import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../test/helpers';
import { GET_SCHEDULED_ITEMS } from './sample-queries.gql';
import { ACCESS_DENIED_ERROR, MozillaAccessGroup } from '../../../shared/types';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('queries: ScheduledCorpusItem - authentication', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);

    // Create some approved items and schedule them for a date in the future
    for (let i = 0; i < 5; i++) {
      const approvedItem = await createApprovedItemHelper(db, {
        title: `Batch 1, Story #${i + 1}`,
      });
      await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date('2050-01-01').toISOString(),
      });
    }

    // Create more approved items for a different scheduled date
    for (let i = 0; i < 10; i++) {
      const approvedItem = await createApprovedItemHelper(db, {
        title: `Batch 2, Story #${i + 1}`,
      });
      await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date('2025-05-05').toISOString(),
      });
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  describe('getScheduledCorpusItems query', () => {
    it('should get all items when the user has read-only access', async () => {
      // adding headers with groups with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SCHEDULED_ITEMS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              startDate: '2000-01-01',
              endDate: '2050-12-31',
            },
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const resultArray = result.body.data?.getScheduledCorpusItems;
      expect(resultArray).toHaveLength(2);
      expect(resultArray[0].totalCount).toEqual(10);
      expect(resultArray[0].items).toHaveLength(10);
    });

    it('should get all items when user the has only one scheduled surface access', async () => {
      // adding headers with groups with DE_DE surface access only
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      // even though user has access for DE_DE only, a request for EN_US should work
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SCHEDULED_ITEMS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              startDate: '2000-01-01',
              endDate: '2050-12-31',
            },
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const resultArray = result.body.data?.getScheduledCorpusItems;
      expect(resultArray).toHaveLength(2);
      expect(resultArray[0].totalCount).toEqual(10);
      expect(resultArray[0].items).toHaveLength(10);
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
          query: print(GET_SCHEDULED_ITEMS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              startDate: '2000-01-01',
              endDate: '2050-12-31',
            },
          },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED'
      );
    });

    it('should throw an error when request header groups are undefined', async () => {
      // Set up auth headers with no valid access group
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // explicitly omit groups
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SCHEDULED_ITEMS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              startDate: '2000-01-01',
              endDate: '2050-12-31',
            },
          },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();

      // check if the error we get is access denied error
      expect(result.body.errors?.[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors?.[0].extensions?.code).toEqual(
        'UNAUTHENTICATED'
      );
    });
  });
});
