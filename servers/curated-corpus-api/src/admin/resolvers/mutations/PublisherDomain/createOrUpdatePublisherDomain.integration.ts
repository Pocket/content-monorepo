import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { MozillaAccessGroup } from 'content-common';

import { client } from '../../../../database/client';
import { clearDb } from '../../../../test/helpers';
import { CREATE_OR_UPDATE_PUBLISHER_DOMAIN } from '../sample-mutations.gql';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: PublisherDomain (createOrUpdatePublisherDomain)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;

  // Headers for a user with corpus write access
  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  // Headers for a user WITHOUT corpus write access
  const headersNoAccess = {
    name: 'No Access User',
    username: 'no.access@test.com',
    groups: 'group1,group2',
  };

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
  });

  afterAll(async () => {
    await server.stop();
    await clearDb(db);
    await db.$disconnect();
  });

  afterEach(async () => {
    await clearDb(db);
  });

  describe('successful operations', () => {
    it('should create a new PublisherDomain mapping', async () => {
      const input = {
        domainName: 'example.com',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      expect(response.domainName).toEqual('example.com');
      expect(response.publisher).toEqual('Example Publisher');
      expect(response.createdBy).toEqual('test.user@test.com');
      expect(response.createdAt).toBeDefined();
      expect(response.updatedAt).toBeDefined();
      expect(response.updatedBy).toBeNull();
    });

    it('should update an existing PublisherDomain mapping', async () => {
      // First create a record
      await db.publisherDomain.create({
        data: {
          domainName: 'example.com',
          publisher: 'Old Publisher Name',
          createdBy: 'original.user@test.com',
        },
      });

      const input = {
        domainName: 'example.com',
        publisher: 'New Publisher Name',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      expect(response.domainName).toEqual('example.com');
      expect(response.publisher).toEqual('New Publisher Name');
      // Original creator should be preserved
      expect(response.createdBy).toEqual('original.user@test.com');
      // updatedBy should be the current user
      expect(response.updatedBy).toEqual('test.user@test.com');
    });

    it('should sanitize domain name (lowercase, strip www)', async () => {
      const input = {
        domainName: '  WWW.Example.COM  ',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      // Domain should be sanitized
      expect(response.domainName).toEqual('example.com');
    });

    it('should convert IDN to punycode', async () => {
      const input = {
        domainName: 'münchen.com',
        publisher: 'Munich Times',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      // IDN should be converted to punycode
      expect(response.domainName).toEqual('xn--mnchen-3ya.com');
    });

    it('should preserve publisher casing but trim whitespace', async () => {
      const input = {
        domainName: 'example.com',
        publisher: '  The New York Times  ',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      // Publisher should be trimmed but casing preserved
      expect(response.publisher).toEqual('The New York Times');
    });

    it('should allow subdomain entries', async () => {
      const input = {
        domainName: 'news.example.com',
        publisher: 'Example News',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const response = result.body.data?.createOrUpdatePublisherDomain;
      expect(response.domainName).toEqual('news.example.com');
    });
  });

  describe('validation errors', () => {
    it('should reject URLs with http scheme', async () => {
      const input = {
        domainName: 'http://example.com',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        'Domain name must be a hostname, not a full URL',
      );
    });

    it('should reject URLs with https scheme', async () => {
      const input = {
        domainName: 'https://example.com/path',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        'Domain name must be a hostname, not a full URL',
      );
    });

    it('should reject wildcard domains', async () => {
      const input = {
        domainName: '*.example.com',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        'Wildcard domain names are not supported',
      );
    });

    it('should reject IP addresses', async () => {
      const input = {
        domainName: '192.168.1.1',
        publisher: 'IP Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        'IP addresses are not valid domain names',
      );
    });

    it('should reject public suffixes (e.g., co.uk)', async () => {
      const input = {
        domainName: 'co.uk',
        publisher: 'UK Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        '"co.uk" is not a valid domain name',
      );
    });

    it('should reject localhost', async () => {
      const input = {
        domainName: 'localhost',
        publisher: 'Local Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        '"localhost" is not a valid domain name',
      );
    });

    it('should reject empty domain name after trimming', async () => {
      const input = {
        domainName: '   ',
        publisher: 'Empty Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
      expect(result.body.errors?.[0].message).toContain(
        'Domain name cannot be empty',
      );
    });
  });

  describe('authorization', () => {
    it('should fail if user does not have corpus write access', async () => {
      const input = {
        domainName: 'example.com',
        publisher: 'Example Publisher',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headersNoAccess)
        .send({
          query: print(CREATE_OR_UPDATE_PUBLISHER_DOMAIN),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].extensions?.code).toEqual('UNAUTHENTICATED');
      expect(result.body.errors?.[0].message).toContain(
        'You do not have access to perform this action',
      );
    });
  });
});
