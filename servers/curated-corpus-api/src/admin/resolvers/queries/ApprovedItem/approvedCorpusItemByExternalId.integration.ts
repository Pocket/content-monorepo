import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { ApprovedItem, PrismaClient } from '.prisma/client';

import { client } from '../../../../database/client';
import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import { GET_APPROVED_ITEM_BY_EXTERNAL_ID } from '../sample-queries.gql';
import { MozillaAccessGroup } from '../../../../shared/types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: ApprovedCorpusItem (approvedCorpusItemByExternalId)', () => {
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

  const items: ApprovedItem[] = [];

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));

    db = client();

    await clearDb(db);

    // Create a few corpus items
    const storyInput = [
      {
        title: 'Story one',
      },
      {
        title: 'Story two',
      },
      {
        title: 'Story three',
      },
    ];

    for (const input of storyInput) {
      const item = await createApprovedItemHelper(db, input);
      items.push(item);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('should get an existing approved item by externalId', async () => {
    // Let's use a known external ID from the sample subset above
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
        variables: {
          externalId: items[0].externalId,
        },
      });

    // There should be no errors
    expect(result.body.errors).toBeUndefined();

    // Proceed with verifying the data
    // Is this really the item we wanted to retrieve?
    const item = result.body.data?.approvedCorpusItemByExternalId;
    expect(item.externalId).toEqual(items[0].externalId);
    expect(item.url).toEqual(items[0].url);

    // Does the query return all the other properties of an Approved Item?
    expect(item.externalId).toBeDefined();
    expect(item.prospectId).toBeDefined();
    expect(item.title).toBeDefined();
    expect(item.language).toBeDefined();
    expect(item.publisher).toBeDefined();
    expect(item.imageUrl).toBeDefined();
    expect(item.excerpt).toBeDefined();
    expect(item.status).toBeDefined();
    expect(item.topic).toBeDefined();
    expect(item.source).toBeDefined();
    expect(typeof item.isCollection).toBe('boolean');
    expect(typeof item.isTimeSensitive).toBe('boolean');
    expect(typeof item.isSyndicated).toBe('boolean');
    expect(typeof item.hasTrustedDomain).toBe('boolean');
  });

  it('should return null when nothing for a given externalId is found', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_APPROVED_ITEM_BY_EXTERNAL_ID),
        variables: {
          externalId: 'this-id-does-not-exist',
        },
      });

    expect(result.body.data).toHaveProperty('approvedCorpusItemByExternalId');

    // There should be no data returned
    expect(result.body.data?.approvedCorpusItemByExternalId).toBeNull();

    // There should be no errors
    expect(result.body.errors).toBeUndefined();
  });
});
