import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';


import { client } from '../../../database/client';
import { ApprovedItem } from '../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createSectionItemHelper,
  createApprovedItemHelper,
} from '../../../test/helpers';

import { GET_SECTIONS } from './sample-queries.gql';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';

describe('queries: Section (getSectionsWithSectionItems)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IPublicContext>;
  let section1: Section;
  let section2: Section;
  let sectionItem1: SectionItem;
  let sectionItem2: SectionItem;
  let approvedItem: ApprovedItem;
  let approvedItem2: ApprovedItem;

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
    await clearDb(db);
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Create active Sections
    section1 = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });
    section2 = await createSectionHelper(db, {
      externalId: 'xyz-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });

    // Create in-active Section
    await createSectionHelper(db, {
      externalId: 'abc-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: false
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should retrieve all active Sections with no SectionItems', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();
    // There should be 2 active Sections in the array, Section #3 is in-active
    expect(result.body.data?.getSections.length).toEqual(2);

    // Both active Sections should not have any SectionItems
    expect(result.body.data?.getSections[0].sectionItems).toEqual([]);
    expect(result.body.data?.getSections[1].sectionItems).toEqual([]);
  });

  it('should retrieve all active Sections with their corresponding active SectionItems', async () => {
    // Create a few active SectionItems
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem1 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section1.id,
      rank: 1,
      active: true,
    });

    sectionItem2 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section2.id,
      rank: 2,
      active: true,
    });

    // Create an in-active SectionItem for Section #1
    approvedItem2 = await createApprovedItemHelper(db, {
      title: 'John Doe',
    });

    await createSectionItemHelper(db, {
      approvedItemId: approvedItem2.id,
      sectionId: section1.id,
      rank: 1,
      active: false,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // All active Sections should be returned, Section #3 (abc-123) is in-active
    expect(result.body.data?.getSections.length).toEqual(2);
    expect(result.body.data?.getSections[0].externalId).toEqual('bcg-456');
    expect(result.body.data?.getSections[1].externalId).toEqual('xyz-123');

    // Each active Section should have an active SectionItem
    // Section #1 has 2 SectionItems but only the active (1) SectionItem is returned
    expect(result.body.data?.getSections[0].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSections[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);

    expect(result.body.data?.getSections[1].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSections[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
  });

  it('should return an empty array if no Sections found', async () => {
    // clear db
    await clearDb(db);

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.getSections).toEqual([]);
  });
});