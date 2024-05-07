import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import { ScheduledItemSource } from 'content-common';

import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { GET_SCHEDULED_ITEMS } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: ScheduledCorpusItem (getScheduledCorpusItems)', () => {
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
        source:
          i % 2 === 0 ? ScheduledItemSource.MANUAL : ScheduledItemSource.ML,
      });
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('should return all requested items', async () => {
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

    // Good to check this here before we get into actual return values
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    const resultArray = result.body.data?.getScheduledCorpusItems;
    expect(resultArray).toHaveLength(2);
    expect(resultArray[0].totalCount).toEqual(10);
    expect(resultArray[0].items).toHaveLength(10);
  });

  it('should return all expected properties', async () => {
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

    // Check the first group of scheduled items
    expect(resultArray[0].collectionCount).toBeDefined();
    expect(resultArray[0].syndicatedCount).toBeDefined();
    expect(resultArray[0].totalCount).toBeDefined();
    expect(resultArray[0].scheduledDate).toBeDefined();
    // we don't have the source property on the first batch of test items
    expect(resultArray[0].source).not.toBeDefined();

    // Check the first item in the first group
    const firstItem = resultArray[0].items[0];

    // Scalar properties
    expect(firstItem.externalId).toBeDefined();
    expect(firstItem.createdAt).toBeDefined();
    expect(firstItem.createdBy).toBeDefined();
    expect(firstItem.updatedAt).toBeDefined();
    expect(firstItem.updatedBy).toBeNull();
    expect(firstItem.scheduledDate).toBeDefined();

    // The underlying Approved Item
    expect(firstItem.approvedItem.externalId).toBeDefined();
    expect(firstItem.approvedItem.title).toBeDefined();
    expect(firstItem.approvedItem.url).toBeDefined();
    expect(firstItem.approvedItem.hasTrustedDomain).toBeDefined();
    expect(firstItem.approvedItem.excerpt).toBeDefined();
    expect(firstItem.approvedItem.imageUrl).toBeDefined();
    expect(firstItem.approvedItem.createdBy).toBeDefined();
  });

  it('should return all scheduled items with half being MANUAL and half being ML', async () => {
    // make a request for scheduled items
    const scheduledItems = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SCHEDULED_ITEMS),
        variables: {
          filters: {
            scheduledSurfaceGuid: 'NEW_TAB_EN_US',
            startDate: '2000-01-01',
            endDate: '2025-05-05',
          },
        },
      });

    // Good to check this here before we get into actual return values
    expect(scheduledItems.body.errors).toBeUndefined();
    expect(scheduledItems.body.data).not.toBeNull();

    // should be 10 total items
    const resultArray = scheduledItems.body.data?.getScheduledCorpusItems;
    expect(resultArray[0].totalCount).toEqual(10);

    // filter out MANUAL items
    const manualScheduledItems = resultArray[0].items.filter(
      (item) => item.source === ScheduledItemSource.MANUAL,
    );
    expect(manualScheduledItems.length).toEqual(5);

    // filter out ML items
    const mlScheduledItems = resultArray[0].items.filter(
      (item) => item.source === ScheduledItemSource.ML,
    );
    expect(mlScheduledItems.length).toEqual(5);
  });

  it('should group scheduled items by date', async () => {
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

    expect(resultArray[0].totalCount).toEqual(10);
    expect(resultArray[0].items).toHaveLength(10);
    expect(resultArray[0].scheduledDate).toEqual('2025-05-05');

    expect(resultArray[1].totalCount).toEqual(5);
    expect(resultArray[1].items).toHaveLength(5);
    expect(resultArray[1].scheduledDate).toEqual('2050-01-01');
  });

  it('should sort items by scheduleDate asc and updatedAt asc', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SCHEDULED_ITEMS),
        variables: {
          filters: {
            scheduledSurfaceGuid: 'NEW_TAB_EN_US',
            startDate: '2050-01-01',
            endDate: '2050-01-01',
          },
        },
      });

    const resultArray = result.body.data?.getScheduledCorpusItems;

    // get an array of the createdAt values in the order they were returned
    const updatedAtDates = resultArray[0].items.map((item) => {
      return item.updatedAt;
    });

    // sort those createdAt values
    const sortedUpdatedAtDates = updatedAtDates.sort();

    // the returned order should match the sorted order
    expect(updatedAtDates).toStrictEqual(sortedUpdatedAtDates);
  });

  it('should fail on invalid Scheduled Surface GUID', async () => {
    const invalidId = 'not-a-valid-id-by-any-means';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SCHEDULED_ITEMS),
        variables: {
          filters: {
            scheduledSurfaceGuid: invalidId,
            startDate: '2000-01-01',
            endDate: '2050-12-31',
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.length).toEqual(1);
    expect(result.body.errors?.[0].message).toEqual(
      'not-a-valid-id-by-any-means is not a valid Scheduled Surface GUID',
    );
  });

  it('should fail on non-existent Scheduled Surface GUID', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SCHEDULED_ITEMS),
        variables: {
          filters: {
            // can't believe graphql lets you pass an empty string for a required parameter
            scheduledSurfaceGuid: '',
            startDate: '2000-01-01',
            endDate: '2050-12-31',
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.length).toEqual(1);
    expect(result.body.errors?.[0].message).toEqual(
      ' is not a valid Scheduled Surface GUID',
    );
  });
});
