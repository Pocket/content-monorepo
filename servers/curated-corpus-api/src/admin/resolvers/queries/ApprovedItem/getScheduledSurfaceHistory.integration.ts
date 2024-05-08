import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { ApprovedItem, PrismaClient } from '.prisma/client';

import { client } from '../../../../database/client';
import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: ApprovedCorpusItem (getScheduledSurfaceHistory subquery)', () => {
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

    // Create a few items with known URLs.
    const storyInput = [
      {
        title: 'Story one',
        url: 'https://www.test-domain.com/story-one',
      },
      {
        title: 'Story two',
        url: 'https://www.test-domain.com/story-two',
      },
      {
        title: 'Story three',
        url: 'https://www.test-domain.com/story-three',
      },
    ];

    const stories: ApprovedItem[] = [];

    for (const input of storyInput) {
      const story = await createApprovedItemHelper(db, input);
      stories.push(story);
    }

    // Destructure the first two stories to be able to create scheduled
    // entries for them
    const [storyOne, storyTwo] = stories;

    // Set up some scheduled entries for story #1
    // US New Tab, date in 2050
    for (let i = 21; i <= 30; i++) {
      await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem: storyOne,
        scheduledDate: new Date(`2050-01-${i}`).toISOString(),
      });
    }
    // DE New Tab, same dates
    for (let i = 11; i <= 20; i++) {
      await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
        approvedItem: storyOne,
        scheduledDate: new Date(`2050-01-${i}`).toISOString(),
      });
    }
    // Set up more scheduled entries for story #2
    for (let i = 1; i <= 10; i++) {
      await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem: storyTwo,
        scheduledDate: new Date(`2050-01-${i}`).toISOString(),
      });
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('returns an empty array if an Approved Item has not been scheduled onto any surface', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-three',
        },
      });

    // There should be no errors
    expect(result.body.errors).toBeUndefined();

    // There should be no data returned for the subquery (an empty array),
    // since the third story doesn't have any scheduled entries in this test suite.
    expect(
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory,
    ).toHaveLength(0);
  });

  it('returns an empty array if an Approved item has not been scheduled onto a particular surface', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-two',
          scheduledSurfaceGuid: 'NEW_TAB_EN_GB',
        },
      });

    // There should be no errors
    expect(result.body.errors).toBeUndefined();

    // There should be no data returned for the subquery (an empty array),
    // since this story doesn't have any entries on the UK New Tab
    expect(
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory,
    ).toHaveLength(0);
  });

  it('respects the limit on results', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-two',
          scheduledSurfaceGuid: 'NEW_TAB_EN_US',
          limit: 3,
        },
      });

    // There should be no errors
    expect(result.body.errors).toBeUndefined();

    expect(
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory,
    ).toHaveLength(3);
  });

  it('returns results for a specified scheduled surface only', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-one',
          scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
        },
      });

    // There should be no errors.
    expect(result.body.errors).toBeUndefined();

    // We've got ten of these seeded for this test suite.
    const history =
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory;
    expect(history).toHaveLength(10);

    // Let's verify they're all scheduled for DE_DE
    history.forEach((entry) => {
      expect(entry.scheduledSurfaceGuid).toEqual('NEW_TAB_DE_DE');
    });
  });

  it('returns all entries for a given approved item', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-one',
          limit: 100,
        },
      });

    // There should be no errors.
    expect(result.body.errors).toBeUndefined();

    // There's a total of 20 entries for the first story
    expect(
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory,
    ).toHaveLength(20);
  });

  it('returns the scheduled entries in descending order', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_WITH_SCHEDULING_HISTORY),
        variables: {
          url: 'https://www.test-domain.com/story-one',
          scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
        },
      });

    // There should be no errors.
    expect(result.body.errors).toBeUndefined();

    // We've got ten of these seeded for this test suite.
    const history =
      result.body.data?.getApprovedCorpusItemByUrl.scheduledSurfaceHistory;
    expect(history).toHaveLength(10);

    // Let's verify that the results are being returned in descending order
    expect(history[0].scheduledDate).toEqual('2050-01-20');
    expect(history[1].scheduledDate).toEqual('2050-01-19');
    expect(history[2].scheduledDate).toEqual('2050-01-18');
  });
});
