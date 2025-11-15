import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';


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
import { SectionStatus } from '../../../../shared/types';

describe('queries: Section (getSectionsWithSectionItems)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let activeEnabledSection1: Section;
  let activeEnabledSection2: Section;
  let activeDisabledSection: Section;
  let sectionItem1: SectionItem;
  let sectionItem2: SectionItem;
  let sectionItem3: SectionItem;
  let approvedItem: ApprovedItem;
  let approvedItem2: ApprovedItem;

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
    // Create active Sections
    activeEnabledSection1 = await createSectionHelper(db, {
      externalId: 'active-456',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: {
        taxonomy: "IAB-3.0",
        categories: ["488"]
      },
      active: true
    });
    activeEnabledSection2 = await createSectionHelper(db, {
      externalId: 'active-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: {
        taxonomy: "IAB-3.0",
        categories: ["489"]
      },
      active: true
    });
    
    //Create active but disabled Section
    activeDisabledSection = await createSectionHelper(db, {
      externalId: 'disabled-890',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: {
        taxonomy: "IAB-3.0",
        categories: ["495"]
      },
      active: true,
      disabled: true
    });
    

    // Create in-active Section
    await createSectionHelper(db, {
      externalId: 'inactive-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: {
        taxonomy: "IAB-3.0",
        categories: ["502"]
      },
      active: false
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should retrieve all active+disabled Sections with no SectionItems', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();
    // There should be 2 active, 1 active+disabled Sections in the array, Section #4 is in-active
    expect(result.body.data?.getSectionsWithSectionItems.length).toEqual(3);

    // Both active Sections should not have any SectionItems
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems).toEqual([]);
    expect(result.body.data?.getSectionsWithSectionItems[0].disabled).toBeFalsy();
    expect(result.body.data?.getSectionsWithSectionItems[0].iab).toEqual(activeEnabledSection1.iab);

    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems).toEqual([]);
    expect(result.body.data?.getSectionsWithSectionItems[1].disabled).toBeFalsy();
    expect(result.body.data?.getSectionsWithSectionItems[1].iab).toEqual(activeEnabledSection2.iab);
    // The active + disabled section should also be returned in the admin response
    expect(result.body.data?.getSectionsWithSectionItems[2].externalId).toEqual(activeDisabledSection.externalId);
    expect(result.body.data?.getSectionsWithSectionItems[2].sectionItems).toEqual([]);
    expect(result.body.data?.getSectionsWithSectionItems[2].disabled).toBeTruthy();
    expect(result.body.data?.getSectionsWithSectionItems[2].iab).toEqual(activeDisabledSection.iab);
  });

  it('should retrieve all active+disabled Sections with their corresponding active SectionItems', async () => {
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

    sectionItem3 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeDisabledSection.id,
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
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // All active+disabled Sections should be returned, Section #4 (inactive-123) is in-active
    // Also check that status is always returned
    expect(result.body.data?.getSectionsWithSectionItems.length).toEqual(3);
    expect(result.body.data?.getSectionsWithSectionItems[0].externalId).toEqual('active-456');
    expect(result.body.data?.getSectionsWithSectionItems[0].disabled).toBeFalsy();
    expect(result.body.data?.getSectionsWithSectionItems[0].status).toEqual(SectionStatus.LIVE);

    expect(result.body.data?.getSectionsWithSectionItems[1].externalId).toEqual('active-123');
    expect(result.body.data?.getSectionsWithSectionItems[1].disabled).toBeFalsy();
    expect(result.body.data?.getSectionsWithSectionItems[1].status).toEqual(SectionStatus.LIVE);

    expect(result.body.data?.getSectionsWithSectionItems[2].externalId).toEqual('disabled-890');
    expect(result.body.data?.getSectionsWithSectionItems[2].disabled).toBeTruthy();
    expect(result.body.data?.getSectionsWithSectionItems[2].status).toEqual(SectionStatus.DISABLED);

    // Each active Section should have an active SectionItem
    // Section #1 has 2 SectionItems but only the active (1) SectionItem is returned
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionsWithSectionItems[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);

    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionsWithSectionItems[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);

    // Active + disabled section should also return their section items
    expect(result.body.data?.getSectionsWithSectionItems[2].sectionItems.length).toEqual(1);
    expect(result.body.data?.getSectionsWithSectionItems[2].sectionItems[0].externalId).toEqual(sectionItem3.externalId);
  });

  it('should return an empty array if no Sections found', async () => {
    // clear db
    await clearDb(db);

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US"
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.getSectionsWithSectionItems).toEqual([]);
  });

  it('should filter sections by createSource when provided', async () => {
    // Create a MANUAL section
    await createSectionHelper(db, {
      externalId: 'manual-section-1',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
    });

    // Query for only ML sections
    const mlResult = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US",
          createSource: "ML"
        },
      });

    expect(mlResult.body.errors).toBeUndefined();
    // Should return only ML sections (3 from beforeEach)
    expect(mlResult.body.data?.getSectionsWithSectionItems.length).toEqual(3);
    expect(mlResult.body.data?.getSectionsWithSectionItems.every(s => s.createSource === 'ML')).toBeTruthy();

    // Query for only MANUAL sections
    const manualResult = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US",
          createSource: "MANUAL"
        },
      });

    expect(manualResult.body.errors).toBeUndefined();
    // Should return only MANUAL section
    expect(manualResult.body.data?.getSectionsWithSectionItems.length).toEqual(1);
    expect(manualResult.body.data?.getSectionsWithSectionItems[0].externalId).toEqual('manual-section-1');
    expect(manualResult.body.data?.getSectionsWithSectionItems[0].createSource).toEqual('MANUAL');
  });

  it('should return custom section fields', async () => {
    // Create a custom section with description, heroTitle, and heroDescription
    // Use yesterday's date to ensure the section is LIVE (not SCHEDULED)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await createSectionHelper(db, {
      externalId: 'custom-section-with-metadata',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
      description: 'Custom section description',
      heroTitle: 'Hero Title Text',
      heroDescription: 'Hero Description Text',
      startDate: yesterday,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_SECTIONS_WITH_SECTION_ITEMS),
        variables: {
          scheduledSurfaceGuid: "NEW_TAB_EN_US",
          createSource: "MANUAL"
        },
      });

    expect(result.body.errors).toBeUndefined();
    
    const section = result.body.data?.getSectionsWithSectionItems.find(
      s => s.externalId === 'custom-section-with-metadata'
    );
    
    expect(section?.description).toEqual('Custom section description');
    expect(section?.heroTitle).toEqual('Hero Title Text');
    expect(section?.heroDescription).toEqual('Hero Description Text');
    expect(section?.status).toEqual(SectionStatus.LIVE);
  });
});