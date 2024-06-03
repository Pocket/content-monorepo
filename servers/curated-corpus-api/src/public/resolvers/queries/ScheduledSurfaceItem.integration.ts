import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ApprovedItemGrade } from 'content-common';

import { client } from '../../../database/client';
import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../test/helpers';
import { GET_SCHEDULED_SURFACE_WITH_ITEMS } from './sample-queries.gql';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';

describe('queries: ScheduledCuratedCorpusItem', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({
      app,
      publicServer: server,
      publicUrl: graphQLUrl,
    } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  describe('ScheduledSurface->items subquery', () => {
    beforeAll(async () => {
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

      // Create another batch of approved items for a different scheduled surface GUID
      // but the same date as the first batch
      for (let i = 0; i < 7; i++) {
        const approvedItem = await createApprovedItemHelper(db, {
          title: `Batch 3, Story #${i + 1}`,
        });
        await createScheduledItemHelper(db, {
          scheduledSurfaceGuid: 'POCKET_HITS_EN_US',
          approvedItem,
          scheduledDate: new Date('2050-01-01').toISOString(),
        });
      }

      // Create a few records without topics (to model backfilled data)
      for (let i = 0; i < 7; i++) {
        const approvedItem = await createApprovedItemHelper(db, {
          title: `Batch 4, Story #${i + 1}`,
          topic: undefined,
        });
        await createScheduledItemHelper(db, {
          scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
          approvedItem,
          scheduledDate: new Date('3030-01-01').toISOString(),
        });
      }

      // Create a few records with grades (to model optional data)
      for (let i = 0; i < 3; i++) {
        const approvedItem = await createApprovedItemHelper(db, {
          title: `Batch 5, Story #${i + 1}`,
          grade: ApprovedItemGrade.A,
        });

        await createScheduledItemHelper(db, {
          scheduledSurfaceGuid: 'NEW_TAB_ES_ES',
          approvedItem,
          scheduledDate: new Date('3030-02-02').toISOString(),
        });
      }
    });

    it('should return all requested items', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_EN_US',
            date: '2050-01-01',
          },
        });

      // Good to check this here before we get into actual return values
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      expect(result.body.data?.scheduledSurface.items).toHaveLength(5);
    });

    it('should return items for requested scheduled surface only', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'POCKET_HITS_EN_US',
            date: '2050-01-01',
          },
        });

      // Good to check this here before we get into actual return values
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      expect(result.body.data?.scheduledSurface.items).toHaveLength(7);
    });

    it('should return all expected properties', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_EN_US',
            date: '2025-05-05',
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // Let's check the props for the first ScheduledSurfaceItem returned.
      const item = result.body.data?.scheduledSurface.items[0];

      // Scalar properties of the first item
      expect(item.id).toBeDefined();
      expect(item.surfaceId).toEqual('NEW_TAB_EN_US');
      expect(item.scheduledDate).toEqual('2025-05-05');

      // The underlying Corpus Items
      result.body.data?.scheduledSurface.items.forEach((item) => {
        expect(item.corpusItem.id).toBeDefined();
        expect(item.corpusItem.url).toBeDefined();
        expect(item.corpusItem.title).toBeDefined();
        expect(item.corpusItem.excerpt).toBeDefined();
        expect(item.corpusItem.authors).toBeDefined();
        expect(item.corpusItem.language).toBeDefined();
        expect(item.corpusItem.imageUrl).toBeDefined();
        expect(item.corpusItem.image).toBeDefined();
        expect(item.corpusItem.image.url).toBeDefined();
        expect(item.corpusItem.imageUrl).toEqual(item.corpusItem.image.url);
        expect(item.corpusItem.publisher).toBeDefined();
        expect(item.corpusItem.topic).toBeDefined();
        expect(item.corpusItem.grade).toBeDefined();
      });
    });

    it('should return an empty topic when the approved item has no topic', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_DE_DE',
            date: '3030-01-01',
          },
        });

      result.body.data?.scheduledSurface.items.forEach((item) => {
        expect(item.corpusItem.topic).toBeNull();
      });
    });

    it('should return a grade when the approved item has a value', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_ES_ES',
            date: '3030-02-02',
          },
        });

      result.body.data?.scheduledSurface.items.forEach((item) => {
        // all results for this query are guaranteed to have a grade of "A"
        // based on the seeding in `beforeAll` above
        expect(item.corpusItem.grade).toEqual(ApprovedItemGrade.A);
      });
    });

    it('should sort the items by updatedAt asc', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_EN_US',
            date: '2025-05-05',
          },
        });

      const items = result.body.data?.scheduledSurface.items;

      const updatedAtDates = items.map((item) => {
        return item.updatedAt;
      });

      const sortedUpdatedAtDates = updatedAtDates.sort();

      expect(updatedAtDates).toStrictEqual(sortedUpdatedAtDates);
    });

    it('should return an empty result set if nothing is available', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE_WITH_ITEMS),
          variables: {
            id: 'NEW_TAB_EN_US',
            date: '2100-02-02',
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      expect(result.body.data?.scheduledSurface.items).toHaveLength(0);
    });
  });
});
