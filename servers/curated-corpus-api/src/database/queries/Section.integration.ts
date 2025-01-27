import { PrismaClient, Section } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { getSectionsWithSectionItems } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';
import { ScheduledSurfacesEnum } from 'content-common';

describe('Section', () => {
  let db: PrismaClient;
  let section1: Section;
  let section2: Section;

  beforeAll(async () => {
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);
    // Create active sections
    section1 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});
    section2 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});

    // Create in-active section
    await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: false});
  });

  describe('getSectionsWithSectionItems', () => {
    it('should retrieve all active Sections', async () => {
      const result = await getSectionsWithSectionItems(db, 'NEW_TAB_EN_US');

      // There should be 2 active Sections returned in the array, Section #3 is inactive
      expect(result.length).toEqual(2);
      expect(result[0].externalId).toEqual(section1.externalId);
      expect(result[1].externalId).toEqual(section2.externalId);
    });
    it('should retrieve all active Sections with their corresponding active SectionItems', async () => {
      // create a few active SectionItems
      const approvedItem1 = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });
      const approvedItem2 = await createApprovedItemHelper(db, {
        title: 'Fake Item2!',
      });
      const sectionItem1 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: section1.id,
        rank: 1,
        active: true
      });
      const sectionItem2 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem2.id,
        sectionId: section2.id,
        rank: 2,
        active: true
      });

      // Create an in-active SectionItem for Section #1
      const approvedItem3 = await createApprovedItemHelper(db, {
        title: 'Fake Item3!',
      });
      await createSectionItemHelper(db, {
        approvedItemId: approvedItem3.id,
        sectionId: section1.id,
        rank: 3,
        active: false
      });

      const result = await getSectionsWithSectionItems(db, 'NEW_TAB_EN_US');

      // There should be 2 active Sections returned in the array, Section #3 is in-active
      expect(result.length).toEqual(2);
      // Each Section should have 1 active SectionItem in the array
      expect(result[0].sectionItems.length).toEqual(1); // Section #1 has 2 SectionItems, but only 1 is active
      expect(result[1].sectionItems.length).toEqual(1);
      // Check for correct SectionItems
      expect(result[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);
      expect(result[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
    });
    it('should return an empty array if there are no Sections found', async () => {
      // clear db
      await clearDb(db);

      const result = await getSectionsWithSectionItems(db, 'NEW_TAB_EN_US');

      expect(result).toEqual([]);
    });
  });
});
