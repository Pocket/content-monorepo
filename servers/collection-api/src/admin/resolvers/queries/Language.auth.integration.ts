import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';

import { GET_LANGUAGES } from './sample-queries.gql';
import { ACCESS_DENIED_ERROR, READONLY } from '../../../shared/constants';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('auth: Language', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('getLanguages query', () => {
    it('should succeed if a user has only READONLY access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // missing any collection/readoly group
        groups: `group1,group2,${READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_LANGUAGES) });

      // we shouldn't have any errors
      expect(result.body.errors).not.toBeTruthy();

      // and data should exist
      expect(result.body.data).toBeTruthy();
    });

    it('should fail if user does not have access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        // missing any collection/readoly group
        groups: `group1,group2`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_LANGUAGES) });

      // ...without success. There is no data
      expect(result.body.data).not.toBeTruthy();

      // And there is an access denied error
      expect(result.body.errors[0].message).toEqual(ACCESS_DENIED_ERROR);
    });

    it('should fail if auth headers are empty', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({ query: print(GET_LANGUAGES) });

      // ...without success. There is no data
      expect(result.body.data).not.toBeTruthy();

      // And there is an access denied error
      expect(result.body.errors[0].message).toEqual(ACCESS_DENIED_ERROR);
      expect(result.body.errors[0].extensions.code).toEqual('FORBIDDEN');
    });
  });
});
