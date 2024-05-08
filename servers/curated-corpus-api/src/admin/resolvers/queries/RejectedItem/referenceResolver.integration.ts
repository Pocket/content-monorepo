import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import {
  clearDb,
  createRejectedCuratedCorpusItemHelper,
} from '../../../../test/helpers';
import { REJECTED_ITEM_REFERENCE_RESOLVER } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: RejectedCorpusItem (reference resolver)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
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
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story two',
        url: 'https://www.test2.com/story-two',
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story three',
        url: 'https://www.test2.com/story-three',
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story four',
        url: 'https://www.test2.com/story-four',
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story five',
        url: 'https://www.test2.com/story-five',
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story six',
        url: 'https://www.test2.com/story-six',
        language: 'EN',
        reason: 'fake reason',
      },
      {
        title: 'Story seven',
        url: 'https://www.test2.com/story-seven',
        language: 'EN',
        reason: 'fake reason',
      },
    ];

    for (const input of storyInput) {
      await createRejectedCuratedCorpusItemHelper(db, input);
    }
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('returns the rejected item if it exists', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECTED_ITEM_REFERENCE_RESOLVER),
        variables: {
          representations: [
            {
              __typename: 'RejectedCorpusItem',
              url: 'https://www.test2.com/story-three',
            },
          ],
        },
      });

    expect(result.body.errors).toBeUndefined();

    expect(result.body.data).not.toBeNull();
    expect(result.body.data?._entities).toHaveLength(1);
  });

  it('returns multiple items in the correct order', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECTED_ITEM_REFERENCE_RESOLVER),
        variables: {
          representations: [
            {
              __typename: 'RejectedCorpusItem',
              url: 'https://www.test2.com/story-seven',
            },
            {
              __typename: 'RejectedCorpusItem',
              url: 'https://www.test2.com/story-three',
            },
            {
              __typename: 'RejectedCorpusItem',
              url: 'https://www.sample-domain.com/what-zombies-can-teach-you-graphql',
            },
            {
              __typename: 'RejectedCorpusItem',
              url: 'https://www.test2.com/story-two',
            },
          ],
        },
      });

    expect(result.body.errors).toBeUndefined();

    expect(result.body.data).not.toBeNull();
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
