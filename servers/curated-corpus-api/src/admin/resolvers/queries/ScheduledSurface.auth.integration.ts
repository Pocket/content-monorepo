import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
import { client } from '../../../database/client';

import { clearDb } from '../../../test/helpers';
import { GET_SCHEDULED_SURFACES_FOR_USER } from './sample-queries.gql';
import { MozillaAccessGroup } from '../../../shared/types';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('auth: ScheduledSurface', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('getScheduledSurfacesForUser query', () => {
    it('should return all available surfaces for read-only users', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_SCHEDULED_SURFACES_FOR_USER) });

      const scheduledSurfaces = result.body.data?.getScheduledSurfacesForUser;

      expect(scheduledSurfaces).toHaveLength(scheduledSurfaces.length);

      scheduledSurfaces.forEach((scheduledSurface) => {
        expect(scheduledSurface.guid).toBeDefined();
        expect(scheduledSurface.name).toBeDefined();
        expect(scheduledSurface.ianaTimezone).toBeDefined();
        expect(scheduledSurface.prospectTypes).toBeDefined();
      });
    });

    it('should return all available surfaces for users with full access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_SCHEDULED_SURFACES_FOR_USER) });

      const scheduledSurfaces = result.body.data?.getScheduledSurfacesForUser;

      expect(scheduledSurfaces).toHaveLength(scheduledSurfaces.length);

      scheduledSurfaces.forEach((scheduledSurface) => {
        expect(scheduledSurface.guid).toBeDefined();
        expect(scheduledSurface.name).toBeDefined();
        expect(scheduledSurface.ianaTimezone).toBeDefined();
        expect(scheduledSurface.prospectTypes).toBeDefined();
      });
    });

    it('should return a single surface for users with access to one scheduled surface', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_SCHEDULED_SURFACES_FOR_USER) });

      const scheduledSurfaces = result.body.data?.getScheduledSurfacesForUser;

      expect(scheduledSurfaces).toHaveLength(1);
      expect(scheduledSurfaces[0].guid).toEqual('NEW_TAB_EN_US');
    });

    it('should return a limited set of scheduled surfaces for users with limited scheduled surface access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS},${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_SCHEDULED_SURFACES_FOR_USER) });

      const scheduledSurfaces = result.body.data?.getScheduledSurfacesForUser;

      expect(scheduledSurfaces).toHaveLength(2);
      expect(scheduledSurfaces[0].guid).toEqual('NEW_TAB_EN_US');
      expect(scheduledSurfaces[1].guid).toEqual('NEW_TAB_DE_DE');
    });

    it('should return no scheduled surfaces for users with no access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,group3`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_SCHEDULED_SURFACES_FOR_USER) });

      const scheduledSurfaces = result.body.data?.getScheduledSurfacesForUser;

      expect(scheduledSurfaces).toHaveLength(0);
    });
  });
});
