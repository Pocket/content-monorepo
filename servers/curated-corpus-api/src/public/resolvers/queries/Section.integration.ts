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

describe('queries: Section (getSections)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IPublicContext>;
  let activeEnabledSection1: Section;
  let activeEnabledSection2: Section;
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
    activeEnabledSection1 = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });
    activeEnabledSection2 = await createSectionHelper(db, {
      externalId: 'xyz-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });
    // Create active but disabled section
    await createSectionHelper(db, {
      externalId: 'bdf-345',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: true
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

  it('should only retrieve all active & enabled Sections with no SectionItems', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          filters: {
            scheduledSurfaceGuid: "NEW_TAB_EN_US"
          }
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();
    // double check there are 4 sections created in the DB
    const allDBSections = await db.section.findMany();
    expect(allDBSections.length).toEqual(4);
    // There should be 2 active Sections in the array, Section #3 is active but disabled
    // & Section #4 is in-active
    expect(result.body.data?.getSections.length).toEqual(2);

    // Both active & enabled Sections should not have any SectionItems
    expect(result.body.data?.getSections[0].sectionItems).toEqual([]);
    expect(result.body.data?.getSections[0].disabled).toBeFalsy();

    expect(result.body.data?.getSections[1].sectionItems).toEqual([]);
    expect(result.body.data?.getSections[1].disabled).toBeFalsy();
  });

  it('should only retrieve all active & enabled Sections with their corresponding active SectionItems', async () => {
    // Create a few active SectionItems
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem1 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeEnabledSection1.id,
      rank: 1,
      active: true,
    });

    sectionItem2 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeEnabledSection2.id,
      rank: 2,
      active: true,
    });

    // Create an in-active SectionItem for Section #1
    approvedItem2 = await createApprovedItemHelper(db, {
      title: 'John Doe',
    });

    await createSectionItemHelper(db, {
      approvedItemId: approvedItem2.id,
      sectionId: activeEnabledSection1.id,
      rank: 1,
      active: false,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          filters: {
            scheduledSurfaceGuid: "NEW_TAB_EN_US"
          }
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // All active & enabled Sections should be returned, Section #3 is active but disabled
    // Section #4 (abc-123) is in-active
    expect(result.body.data?.getSections.length).toEqual(2);
    expect(result.body.data?.getSections[0].externalId).toEqual('bcg-456');
    expect(result.body.data?.getSections[0].disabled).toBeFalsy();

    expect(result.body.data?.getSections[1].externalId).toEqual('xyz-123');
    expect(result.body.data?.getSections[1].disabled).toBeFalsy();

    // Each active Section should have an active SectionItem
    // Section #1 has 2 SectionItems but only the active (1) SectionItem is returned
    expect(result.body.data?.getSections[0].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSections[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);

    expect(result.body.data?.getSections[1].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSections[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);

    // Check that corpusItem is present in the sectionItems
    expect(result.body.data?.getSections[0].sectionItems[0].corpusItem).toBeDefined();
    expect(result.body.data?.getSections[0].sectionItems[0].corpusItem.id).toEqual(approvedItem.externalId);
    expect(result.body.data?.getSections[0].sectionItems[0].corpusItem.title).toEqual(approvedItem.title);
    expect(result.body.data?.getSections[1].sectionItems[0].corpusItem).toBeDefined();
    expect(result.body.data?.getSections[1].sectionItems[0].corpusItem.title).toEqual(approvedItem.title);
    expect(result.body.data?.getSections[1].sectionItems[0].corpusItem.id).toEqual(approvedItem.externalId);
  });

  it('should return an empty array if no Sections found', async () => {
    // clear db
    await clearDb(db);

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(GET_SECTIONS),
        variables: {
          filters: {
            scheduledSurfaceGuid: "NEW_TAB_EN_US"
          }
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.getSections).toEqual([]);
  });
});