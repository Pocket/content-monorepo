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
    jest.restoreAllMocks(); // clean Date.now mock
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

    const sections = result.body.data?.getSections;
    // There should be 2 active Sections in the array, Section #3 is active but disabled
    // & Section #4 is in-active
    expect(sections.length).toEqual(2);

    // Both active & enabled Sections should not have any SectionItems
    expect(sections[0].sectionItems).toEqual([]);
    expect(sections[0].disabled).toBeFalsy();

    expect(sections[1].sectionItems).toEqual([]);
    expect(sections[1].disabled).toBeFalsy();
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

    const sections = result.body.data?.getSections;

    // All active & enabled Sections should be returned, Section #3 is active but disabled
    // Section #4 (abc-123) is in-active
    expect(sections.length).toEqual(2);
    expect(sections[0].externalId).toEqual('bcg-456');
    expect(sections[0].disabled).toBeFalsy();

    expect(sections[1].externalId).toEqual('xyz-123');
    expect(sections[1].disabled).toBeFalsy();

    // Each active Section should have an active SectionItem
    // Section #1 has 2 SectionItems but only the active (1) SectionItem is returned
    expect(sections[0].sectionItems.length).toEqual(1);
    expect(sections[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);

    expect(sections[1].sectionItems.length).toEqual(1);
    expect(sections[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);

    // Check that corpusItem is present in the sectionItems
    expect(sections[0].sectionItems[0].corpusItem).toBeDefined();
    expect(sections[0].sectionItems[0].corpusItem.id).toEqual(approvedItem.externalId);
    expect(sections[0].sectionItems[0].corpusItem.title).toEqual(approvedItem.title);
    expect(sections[1].sectionItems[0].corpusItem).toBeDefined();
    expect(sections[1].sectionItems[0].corpusItem.title).toEqual(approvedItem.title);
    expect(sections[1].sectionItems[0].corpusItem.id).toEqual(approvedItem.externalId);
  });

  it('should return only LIVE sections (startDate logic respected)', async () => {
    // clear DB to create some Sections specifically for this test case
    await clearDb(db);

    // Mock currentDate to 2024-06-15
    const currentDate = new Date('2024-06-15T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(currentDate.getTime());

    // Create a truly LIVE Custom Section (startDate <= currentDate < endDate)
    const liveCustomSection = await createSectionHelper(db, {
      externalId: 'live-custom-section',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-20'),
    });

    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Active & live section item',
    });

    const liveCustomSectionItem = await createSectionItemHelper(db, {
      sectionId: liveCustomSection.id,
      approvedItemId: approvedItem.id,
      active: true,
      rank: 0,
    });

    // Create a truly LIVE ML Section (no startDate & endDate)
    const liveMLSection = await createSectionHelper(db, {
      externalId: 'live-ML-section',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
    });

    const liveMLSectionItem = await createSectionItemHelper(db, {
      sectionId: liveMLSection.id,
      approvedItemId: approvedItem.id,
      active: true,
      rank: 0,
    });

    // Create a DISABLED Section
    await createSectionHelper(db, {
      externalId: 'disabled-section',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: true,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-20'),
    });

    // Create an IN-ACTIVE Section
    await createSectionHelper(db, {
      externalId: 'in-active-section',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: false,
      disabled: false,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-20'),
    });

    // Create a SCHEDULED Custom Section (startDate > currentDate)
    await createSectionHelper(db, {
      externalId: 'scheduled-section',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
      startDate: new Date('2024-06-25'),
      endDate: new Date('2024-07-25'),
    });

    // Create an EXPIRED Custom Section (endDate <= currentDate)
    await createSectionHelper(db, {
      externalId: 'expired-section',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: false,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-10'),
    });

    // There should be a total of 6 sections in the DB
    const allDBSections = await db.section.findMany();
    expect (allDBSections.length).toEqual(6);

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

    const liveSections = result.body.data?.getSections;

    // Ensure that only 2 live sections (a custom section & an ML section) are returned
    expect(liveSections.length).toBe(2);
    expect(liveSections[0].externalId).toBe('live-custom-section');
    expect(liveSections[0].sectionItems.length).toBe(1);
    expect(liveSections[0].sectionItems[0].externalId).toBe(liveCustomSectionItem.externalId);

    expect(liveSections[1].externalId).toBe('live-ML-section');
    expect(liveSections[1].sectionItems.length).toBe(1);
    expect(liveSections[1].sectionItems[0].externalId).toBe(liveMLSectionItem.externalId);
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