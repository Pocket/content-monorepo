import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
import { client } from '../../../database/client';

import { GET_SCHEDULED_SURFACE } from './sample-queries.gql';
import { clearDb } from '../../../test/helpers';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';

describe('queries: ScheduledSurface', () => {
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

  describe('scheduledSurface query', () => {
    it('should get Scheduled Surface metadata for a given GUID', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SCHEDULED_SURFACE),
          variables: { id: 'NEW_TAB_EN_GB' },
        });

      expect(result.body.data?.scheduledSurface.id).toEqual('NEW_TAB_EN_GB');
      expect(result.body.data?.scheduledSurface.name).toEqual(
        'New Tab (en-GB)'
      );
    });
  });

  it('should throw an error if the GUID provided is not known', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SCHEDULED_SURFACE),
        variables: { id: 'ABRACADABRA' },
      });

    // There should be errors
    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.[0].message).toContain(
      `Could not find Scheduled Surface with id of "ABRACADABRA"`
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
  });
});
