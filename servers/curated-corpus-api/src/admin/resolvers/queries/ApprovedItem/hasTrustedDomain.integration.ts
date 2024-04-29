import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import { MozillaAccessGroup } from '../../../../shared/types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { GET_SCHEDULED_ITEMS } from '../sample-queries.gql';

describe('hasTrustedDomain in getScheduledItems', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  const trustedDomain = 'trusted.example.com';
  const untrustedDomain = 'untrusted.example.com';

  beforeAll(async () => {
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeAll(async () => {
    await db.trustedDomain.create({ data: { domainName: trustedDomain } });

    // Create an approved item with a trusted domain
    const trustedApprovedItem = await createApprovedItemHelper(db, {
      title: 'Trusted Domain Story',
      url: `https://${trustedDomain}/story`,
    });
    await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem: trustedApprovedItem,
      scheduledDate: new Date().toISOString(),
    });

    // Create an approved item with an untrusted domain
    const untrustedApprovedItem = await createApprovedItemHelper(db, {
      title: 'Untrusted Domain Story',
      url: `https://${untrustedDomain}/story`,
    });
    await createScheduledItemHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      approvedItem: untrustedApprovedItem,
      scheduledDate: new Date().toISOString(),
    });
  });

  it('should return the right value for hasTrustedDomain', async () => {
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

    const items = result.body.data.getScheduledCorpusItems[0].items;
    const trustedItem = items.find((item) =>
      item.approvedItem.url.includes(trustedDomain),
    );
    const untrustedItem = items.find((item) =>
      item.approvedItem.url.includes(untrustedDomain),
    );

    expect(trustedItem.approvedItem.hasTrustedDomain).toBeTruthy();
    expect(untrustedItem.approvedItem.hasTrustedDomain).toBeFalsy();
  });
});
