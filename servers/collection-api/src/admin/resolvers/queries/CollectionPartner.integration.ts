import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../database/client';

import { faker } from '@faker-js/faker';
import { CollectionPartner, CollectionPartnershipType } from '.prisma/client';
import config from '../../../config';
import {
  clear as clearDb,
  createCollectionPartnerAssociationHelper,
  createPartnerHelper,
} from '../../../test/helpers';
import { CreateCollectionPartnerInput } from '../../../database/types';
import {
  GET_COLLECTION_PARTNER,
  GET_COLLECTION_PARTNERS,
  GET_COLLECTION_PARTNER_ASSOCIATION,
} from './sample-queries.gql';
import { COLLECTION_CURATOR_FULL } from '../../../shared/constants';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('queries: CollectionPartner', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${COLLECTION_CURATOR_FULL}`,
  };

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
    await server.stop();
  });

  describe('getCollectionPartners query', () => {
    beforeAll(async () => {
      // Create some partners
      await createPartnerHelper(db, 'True Swag');
      await createPartnerHelper(db, 'Free Range Voiceover');
      await createPartnerHelper(db, 'Wearable Tools');
      await createPartnerHelper(db, 'Your Choice Wearables');
    });

    it('should get partners in alphabetical order', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNERS),
          variables: {
            page: 1,
            perPage: 10,
          },
        });

      const data = result.body.data.getCollectionPartners;

      expect(data.partners[0].name).toEqual('Free Range Voiceover');
      expect(data.partners[1].name).toEqual('True Swag');
      expect(data.partners[2].name).toEqual('Wearable Tools');
      expect(data.partners[3].name).toEqual('Your Choice Wearables');
    });

    it('should get all available properties of collection partners', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNERS),
          variables: {
            page: 1,
            perPage: 1,
          },
        });

      const data = result.body.data.getCollectionPartners;

      expect(data.partners[0].externalId).toBeTruthy();
      expect(data.partners[0].name).toBeTruthy();
      expect(data.partners[0].url).toBeTruthy();
      expect(data.partners[0].imageUrl).toBeTruthy();
      expect(data.partners[0].blurb).toBeTruthy();
    });

    it('should respect pagination', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNERS),
          variables: {
            page: 2,
            perPage: 2,
          },
        });

      const data = result.body.data.getCollectionPartners;

      // We expect to get two results back
      expect(data.partners.length).toEqual(2);

      // Starting from page 2 of results, that is, from Wearable Tools
      expect(data.partners[0].name).toEqual('Wearable Tools');
      expect(data.partners[1].name).toEqual('Your Choice Wearables');
    });

    it('should return a pagination object', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNERS),
          variables: {
            page: 2,
            perPage: 3,
          },
        });

      const data = result.body.data.getCollectionPartners;

      expect(data.pagination.currentPage).toEqual(2);
      expect(data.pagination.totalPages).toEqual(2);
      expect(data.pagination.totalResults).toEqual(4);
      expect(data.pagination.perPage).toEqual(3);
    });

    it('should return data if no variables are supplied', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({ query: print(GET_COLLECTION_PARTNERS) });

      const data = result.body.data.getCollectionPartners;

      // Expect to get all our authors back
      expect(data.partners.length).toEqual(4);

      // Expect to see the app defaults for 'page' and 'perPage' variables
      expect(data.pagination.currentPage).toEqual(1);
      expect(data.pagination.perPage).toEqual(
        config.app.pagination.partnersPerPage,
      );
    });
  });

  describe('getCollectionPartner query', () => {
    let partner: CollectionPartner;

    beforeAll(async () => {
      const name = 'Anna Burns';
      const data: CreateCollectionPartnerInput = {
        name,
        url: faker.internet.url(),
        imageUrl: faker.image.url(),
        blurb: faker.lorem.paragraphs(2),
      };
      partner = await db.collectionPartner.create({ data });
    });

    it('should find a partner record by externalId and return all its properties', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNER),
          variables: { id: partner.externalId },
        });

      const data = result.body.data.getCollectionPartner;

      expect(data.externalId).toBeTruthy();
      expect(data.name).toBeTruthy();
      expect(data.url).toBeTruthy();
      expect(data.imageUrl).toBeTruthy();
      expect(data.blurb).toBeTruthy();
    });

    it('should return NOT_FOUND on an invalid partner id', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNER),
          variables: { id: 'invalid-id' },
        });

      expect(result.body.errors.length).toEqual(1);
      expect(result.body.errors[0].message).toEqual(
        `Error - Not Found: invalid-id`,
      );
      expect(result.body.errors[0].extensions.code).toEqual('NOT_FOUND');
      expect(result.body.data.getCollectionPartner).not.toBeTruthy();
    });
  });

  describe('getCollectionPartnerAssociation query', () => {
    it('should get an association by its externalId', async () => {
      const association = await createCollectionPartnerAssociationHelper(db, {
        type: CollectionPartnershipType.PARTNERED,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNER_ASSOCIATION),
          variables: { externalId: association.externalId },
        });

      const data = result.body.data.getCollectionPartnerAssociation;

      expect(data).toBeTruthy();
      expect(data.type).toEqual(CollectionPartnershipType.PARTNERED);
      expect(data.partner).toBeTruthy();
    });

    it('should return NOT_FOUND on an invalid externalId', async () => {
      await createCollectionPartnerAssociationHelper(db, {
        type: CollectionPartnershipType.PARTNERED,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_COLLECTION_PARTNER_ASSOCIATION),
          variables: { externalId: 'invalid-id' },
        });

      expect(result.body.errors.length).toEqual(1);
      expect(result.body.errors[0].message).toEqual(
        `Error - Not Found: invalid-id`,
      );
      expect(result.body.errors[0].extensions.code).toEqual('NOT_FOUND');
      expect(result.body.data.getCollectionPartnerAssociation).not.toBeTruthy();
    });
  });
});
