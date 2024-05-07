import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { client } from '../../../../database/client';
import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import { APPROVED_ITEM_REFERENCE_RESOLVER } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: ApprovedCorpusItem (ApprovedItem reference resolver)', () => {
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
        url: 'https://www.sample-domain.com/what-zombies-can-teach-you-graphql',
      },
      {
        title: 'Story two',
        url: 'https://www.test2.com/story-two',
      },
      {
        title: 'Story three',
        url: 'https://www.test2.com/story-three',
      },
      {
        title: 'Story four',
        url: 'https://www.test2.com/story-four',
      },
      {
        title: 'Story five',
        url: 'https://www.test2.com/story-five',
      },
      {
        title: 'Story six',
        url: 'https://www.test2.com/story-six',
      },
      {
        title: 'Story seven',
        url: 'https://www.test2.com/story-seven',
      },
    ];

    for (const input of storyInput) {
      await createApprovedItemHelper(db, input);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('returns the approved item if it exists', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(APPROVED_ITEM_REFERENCE_RESOLVER),
        variables: {
          representations: [
            {
              __typename: 'ApprovedCorpusItem',
              url: 'https://www.test2.com/story-three',
            },
          ],
        },
      });

    expect(result.body.errors).toBeUndefined();

    expect(result.body.data).toBeDefined();
    expect(result.body.data?._entities).toHaveLength(1);
  });

  it('returns multiple items in the correct order', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(APPROVED_ITEM_REFERENCE_RESOLVER),
        variables: {
          representations: [
            {
              __typename: 'ApprovedCorpusItem',
              url: 'https://www.test2.com/story-seven',
            },
            {
              __typename: 'ApprovedCorpusItem',
              url: 'https://www.test2.com/story-three',
            },
            {
              __typename: 'ApprovedCorpusItem',
              url: 'https://www.sample-domain.com/what-zombies-can-teach-you-graphql',
            },
            {
              __typename: 'ApprovedCorpusItem',
              url: 'https://www.test2.com/story-two',
            },
          ],
        },
      });

    expect(result.body.errors).toBeUndefined();

    expect(result.body.data).toBeDefined();
    expect(result.body.data?._entities).toHaveLength(4);
    expect(result.body.data?._entities[0].url).toEqual(
      'https://www.test2.com/story-seven',
    );
    expect(result.body.data?._entities[1].url).toEqual(
      'https://www.test2.com/story-three',
    );
    expect(result.body.data?._entities[2].url).toEqual(
      'https://www.sample-domain.com/what-zombies-can-teach-you-graphql',
    );
    expect(result.body.data?._entities[3].url).toEqual(
      'https://www.test2.com/story-two',
    );
  });
});
