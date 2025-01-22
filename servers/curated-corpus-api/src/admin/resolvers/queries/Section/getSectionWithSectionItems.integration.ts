import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import { ActivitySource } from 'content-common';


import { client } from '../../../../database/client';
import { ApprovedItem } from '../../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createSectionItemHelper,
  createApprovedItemHelper,
} from '../../../../test/helpers';

import { GET_SECTIONS_WITH_SECTION_ITEMS } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: Section (getSectionsWithSectionItems)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let section1: Section;
  let section2: Section;
  let sectionItem1: SectionItem;
  let sectionItem2: SectionItem;
  let approvedItem: ApprovedItem;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
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

  beforeEach(async () => {
    section1 = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
    });
    section2 = await createSectionHelper(db, {
      externalId: 'xyz-123',
      createSource: ActivitySource.ML,
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should retrieve all Sections with no SectionItems', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // There should be 2 Sections in the array
    expect(result.body.data?.getSectionsWithSectionItems.length).toEqual(2);

    // Both Sections should not have any SectionItems
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems).toEqual([]);
    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems).toEqual([]);
  });

  it('should retrieve all Sections with their corresponding SectionItems', async () => {
    // Create a few SectionItems
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem1 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section1.id,
      rank: 1
    });

    sectionItem2 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section2.id,
      rank: 1
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // All Sections should be returned
    expect(result.body.data?.getSectionsWithSectionItems.length).toEqual(2);
    expect(result.body.data?.getSectionsWithSectionItems[0].externalId).toEqual('bcg-456');
    expect(result.body.data?.getSectionsWithSectionItems[1].externalId).toEqual('xyz-123');

    // Each Section should have a SectionItem
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);

    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
  });

  it('should return an empty array if no Sections found', async () => {
    // clear db
    await clearDb(db);

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.getSectionsWithSectionItems).toEqual([]);
  });
});