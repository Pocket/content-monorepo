import request from 'supertest';
import { ApolloServer } from '@apollo/server';

import { startServer } from './express';
import { IAdminContext } from './admin/context';
import { IPublicContext } from './public/context';

// Apollo Server 5 returns 400 for variable coercion errors by default. The
// admin-api gateway turns a subgraph 400 into "400: Bad Request", so both
// servers set status400ForVariableCoercionErrors: false to keep AS4's 200.
describe('variable coercion errors', () => {
  let app: Express.Application;
  let adminServer: ApolloServer<IAdminContext>;
  let adminUrl: string;
  let publicServer: ApolloServer<IPublicContext>;
  let publicUrl: string;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer, adminUrl, publicServer, publicUrl } =
      await startServer(0));
  });

  afterAll(async () => {
    await adminServer.stop();
    await publicServer.stop();
  });

  it('admin: returns 200 with BAD_USER_INPUT for an invalid Date variable', async () => {
    const result = await request(app)
      .post(adminUrl)
      .send({
        query: `query ($filters: ScheduledCorpusItemsFilterInput!) {
          getScheduledCorpusItems(filters: $filters) { totalCount }
        }`,
        variables: {
          filters: {
            scheduledSurfaceGuid: 'NEW_TAB_EN_US',
            startDate: 'not-a-date',
            endDate: '2050-01-01',
          },
        },
      });

    expect(result.status).toEqual(200);
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
  });

  it('public: returns 200 with BAD_USER_INPUT for an invalid Date variable', async () => {
    const result = await request(app)
      .post(publicUrl)
      .send({
        query: `query ($id: ID!, $date: Date!) {
          scheduledSurface(id: $id) { items(date: $date) { id } }
        }`,
        variables: { id: 'NEW_TAB_EN_US', date: 'not-a-date' },
      });

    expect(result.status).toEqual(200);
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
  });
});
