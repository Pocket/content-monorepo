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

import { GET_SECTION_WITH_SECTION_ITEMS } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('queries: Section (getSectionWithSectionItems)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let section: Section;
  let sectionItem: SectionItem;
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
    section = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should retrieve a Section with no SectionItems', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTION_WITH_SECTION_ITEMS),
        variables: { externalId: section.externalId },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    expect(result.body.data?.getSectionWithSectionItems.externalId).toEqual('bcg-456');
    expect(result.body.data?.getSectionWithSectionItems.sectionItems.length).toEqual(0);
  });

  it('should retrieve a Section with its SectionItem', async () => {
    // Create a SectionItem
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
      rank: 1
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTION_WITH_SECTION_ITEMS),
        variables: { externalId: section.externalId },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    expect(result.body.data?.getSectionWithSectionItems.externalId).toEqual('bcg-456');
    expect(result.body.data?.getSectionWithSectionItems.sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionWithSectionItems.sectionItems[0].externalId).toEqual(sectionItem.externalId);
  });

  it('should return null if Section externalId is not found', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTION_WITH_SECTION_ITEMS),
        variables: { externalId: 'fake-external-id' },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.getSectionWithSectionItems).toBeNull();
  });
});