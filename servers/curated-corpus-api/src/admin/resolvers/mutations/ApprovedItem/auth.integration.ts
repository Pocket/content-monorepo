import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../../database/client';

import {
  ApprovedItem,
  RejectApprovedItemInput,
  UpdateApprovedItemInput,
} from '../../../../database/types';
import {
  ApprovedItemAuthor,
  CreateApprovedCorpusItemApiInput,
  CorpusItemSource,
  CuratedStatus,
  Topics,
  CorpusLanguage,
} from 'content-common';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { MozillaAccessGroup } from 'content-common';
import { clearDb, createApprovedItemHelper, createScheduledItemHelper } from '../../../../test/helpers';
import {
  CREATE_APPROVED_ITEM,
  REJECT_APPROVED_ITEM,
  UPDATE_APPROVED_ITEM,
  UPLOAD_APPROVED_ITEM_IMAGE,
} from '../sample-mutations.gql';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import Upload from 'graphql-upload/Upload.js';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem - authentication checks', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  const rejectApprovedItemForDomainEndpoint = '/admin/reject-approved-corpus-items-for-domain';

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);
  });

  // a standard set of inputs for this mutation
  const input: CreateApprovedCorpusItemApiInput = {
    prospectId: '123-abc',
    title: 'Find Out How I Cured My Docker In 2 Days',
    url: 'https://test.com/docker',
    excerpt: 'A short summary of what this story is about',
    authors: [
      { name: 'Mark Twain', sortOrder: 1 },
      { name: 'Jane Austen', sortOrder: 2 },
    ],
    status: CuratedStatus.CORPUS,
    imageUrl: 'https://test.com/image.png',
    language: CorpusLanguage.DE,
    publisher: 'Convective Cloud',
    datePublished: '2024-01-02',
    topic: Topics.TECHNOLOGY,
    source: CorpusItemSource.PROSPECT,
    isCollection: false,
    isTimeSensitive: true,
    isSyndicated: false,
  };

  describe('createApprovedCorpusItem mutation', () => {
    it('should succeed if user has access to one of scheduled surfaces', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENGB}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // Expect to see all the input data we supplied in the Approved Item
      // returned by the mutation
      expect(result.body.data?.createApprovedCorpusItem).toMatchObject(input);
    });

    it('should fail if request headers are not supplied', async () => {
      // With the default context, the headers are empty
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });

    it("should fail if user doesn't have access to any of scheduled surfaces", async () => {
      // Set up auth headers with access to something irrelevant here, such as collections
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.COLLECTION_CURATOR_FULL}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });

    it('should fail optional scheduling if user has no access to relevant scheduled surface', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      // extra inputs for scheduling - note attempting to schedule onto the US New Tab
      // while only having access to the German New Tab
      input.scheduledDate = '2100-01-01';
      input.scheduledSurfaceGuid = 'NEW_TAB_EN_US';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });
  });

  describe('updateApprovedCorpusItem mutation', () => {
    let item: ApprovedItem;
    let authors: ApprovedItemAuthor[];
    let input: UpdateApprovedItemInput;

    beforeEach(async () => {
      item = await createApprovedItemHelper(db, {
        title: "3 Things Everyone Knows About LEGO That You Don't",
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      // authors from `item` above do not go through graphql and therefore
      // contain extra info (externalId, approvedItemId). we need to remove
      // those properties to prepare an authors array for the update `input`
      // below
      if (item.authors) {
        authors =
          item.authors?.map((author) => ({
            name: author.name,
            sortOrder: author.sortOrder,
          })) ?? [];
      }

      input = {
        externalId: item.externalId,
        title: 'Anything but LEGO',
        excerpt: 'Updated excerpt',
        authors,
        status: CuratedStatus.CORPUS,
        imageUrl: 'https://test.com/image.png',
        language: CorpusLanguage.DE,
        publisher: 'Cloud Factory',
        datePublished: '2024-02-22',
        topic: Topics.BUSINESS,
        isTimeSensitive: true,
      };
    });

    it('should succeed if user has access to one of scheduled surfaces', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENGB}`,
      };

      const res = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      // Good to check for any errors before proceeding with the rest of the test
      expect(res.body.errors).toBeUndefined();
      const data = res.body.data;

      // External ID should be unchanged
      expect(data?.updateApprovedCorpusItem.externalId).toEqual(
        item.externalId,
      );

      // Updated properties should be... updated
      expect(data?.updateApprovedCorpusItem).toMatchObject(input);

      // The `updatedBy` field should now be the SSO username of the user
      // who updated this record
      expect(data?.updateApprovedCorpusItem.updatedBy).toEqual(
        headers.username,
      );
    });

    it('should fail if request headers are not supplied', async () => {
      // With the default context, the headers are empty
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });

    it("should fail if user doesn't have access to any of scheduled surfaces", async () => {
      // Set up auth headers with access to something irrelevant here, such as collections
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.COLLECTION_CURATOR_FULL}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });
  });

  describe('rejectApprovedItem mutation', () => {
    it('should successfully reject an approved item when the user has access to at least one scheduled surface', async () => {
      // Set up auth headers with access to a single Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENGB}`,
      };

      const item = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
      });

      const input: RejectApprovedItemInput = {
        externalId: item.externalId,
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // On success, mutation should return the deleted approved item.
      // Let's verify the id.
      expect(result.body.data?.rejectApprovedCorpusItem.externalId).toEqual(
        item.externalId,
      );
    });

    it('should throw an error when the user has no access any scheduled surface', async () => {
      // Set up auth headers without access to any Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2`,
      };

      const input: RejectApprovedItemInput = {
        externalId: 'test-id',
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error when the user has only read-only access', async () => {
      // Set up auth headers with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,${MozillaAccessGroup.READONLY}`,
      };

      const input: RejectApprovedItemInput = {
        externalId: 'test-id',
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error when the request headers are undefined', async () => {
      // pass in empty object for headers
      const headers = {};

      const input: RejectApprovedItemInput = {
        externalId: 'test-id',
        reason: 'MISINFORMATION,OTHER',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(REJECT_APPROVED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.data).toBeNull();

      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });
  });

  describe('uploadApprovedCuratedCorpusItemImage mutation', () => {
    const testFilePath = __dirname + '/test-image.jpeg';

    beforeEach(() => {
      writeFileSync(testFilePath, 'I am an image');
    });

    afterEach(() => {
      unlinkSync(testFilePath);
    });

    it('should not succeed if user does not have write to corpus privileges', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const image: Upload = new Upload();

      image.resolve({
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        encoding: '7bit',
        createReadStream: () => createReadStream(testFilePath),
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPLOAD_APPROVED_ITEM_IMAGE),
          variables: {
            image: image,
          },
        });

      expect(result.body.data).toBeNull();
      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
    });
  });

  describe('rejectApprovedCorpusItem mutation', () => {
    it('should successfully reject and unschedule approved item for a domain when the user has full access', async () => {
      // Set up auth headers with full access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
      };

      const item1 = await createApprovedItemHelper(db, {
        title: '15 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
        url: "https://elpais.com/example-one/"
      });
      // create a scheduled entry for item1
      await createScheduledItemHelper(db, {
        approvedItem: item1
      });

      const item2 = await createApprovedItemHelper(db, {
        title: '16 Unheard Ways To Achieve Greater Terraform',
        status: CuratedStatus.RECOMMENDATION,
        language: 'EN',
        url: "https://elpais.com/example-two/"
      });
      // create a scheduled entry for item2
      await createScheduledItemHelper(db, {
        approvedItem: item2
      });

      // expect 2 approved corpus items
      let approvedCorpusItems = await db.approvedItem.findMany();
      expect(approvedCorpusItems.length).toEqual(2);

      // // expect 2 scheduled items
      let scheduledItems = await db.scheduledItem.findMany();
      expect(scheduledItems.length).toEqual(2);

      // reject corpus items for elpais.com domain
      // there are 2 approved corpus items & 2 scheduled items
      const result = await request(app)
        .post(rejectApprovedItemForDomainEndpoint)
        .send({ domainName: 'elpais.com', testing: false })
        .set(headers);

      expect(result.status).toEqual(200);

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();
      expect(result.body.testing).toEqual(false);
      expect(result.body.domainName).toEqual('elpais.com');
      expect(result.body.totalFoundApprovedCorpusItems).toEqual(2);
      expect(result.body.totalRejectedApprovedCorpusItems).toEqual(2);
    });

    it('should throw an error when the user has no access any scheduled surface', async () => {
      // Set up auth headers without access to any Scheduled Surface
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2`,
      };

      const result = await request(app)
        .post(rejectApprovedItemForDomainEndpoint)
        .send({ domainName: 'elpais.com', testing: false })
        .set(headers);

      expect(result.error).not.toBeUndefined();
      expect(result.body.data).toBeUndefined();

      expect(result.error.text).toContain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error when the user has only read-only access', async () => {
      // Set up auth headers with read-only access
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,${MozillaAccessGroup.READONLY}`,
      };

      const result = await request(app)
        .post(rejectApprovedItemForDomainEndpoint)
        .send({ domainName: 'elpais.com', testing: false })
        .set(headers);

      expect(result.error).not.toBeUndefined();
      expect(result.body.data).toBeUndefined();

      expect(result.error.text).toContain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error when the request headers are undefined', async () => {
      // pass in empty object for headers
      const headers = {};

      const result = await request(app)
        .post(rejectApprovedItemForDomainEndpoint)
        .send({ domainName: 'elpais.com', testing: false })
        .set(headers);

      expect(result.error).not.toBeUndefined();
      expect(result.body.data).toBeUndefined();

      expect(result.error.text).toContain(ACCESS_DENIED_ERROR);
    });
  });
});
