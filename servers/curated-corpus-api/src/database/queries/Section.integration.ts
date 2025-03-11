import { PrismaClient, Section} from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { getSectionsWithSectionItems } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';
import { ScheduledSurfacesEnum } from 'content-common';

describe('Section', () => {
  let db: PrismaClient;
  let activeEnabledSection1: Section;
  let activeEnabledSection2: Section;
  let activeDisabledSection: Section;

  beforeAll(async () => {
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);
    // Create active & enabled sections
    activeEnabledSection1 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});
    activeEnabledSection2 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});
    // Create active + disabled section
    activeDisabledSection= await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true, disabled: true});
    // Create in-active section
    await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: false});
  });

  describe('getSectionsWithSectionItems', () => {
    describe('when using PublicContextManager', () => {
      it('should return ONLY active & enabled Sections + SectionItems', async () => {
        // create a few active SectionItems
        const approvedItem1 = await createApprovedItemHelper(db, {
          title: 'Fake Item!',
        });
        const approvedItem2 = await createApprovedItemHelper(db, {
          title: 'Fake Item2!',
        });
        const sectionItem1 = await createSectionItemHelper(db, {
          approvedItemId: approvedItem1.id,
          sectionId: activeEnabledSection1.id,
          rank: 1,
          active: true
        });
        const sectionItem2 = await createSectionItemHelper(db, {
          approvedItemId: approvedItem2.id,
          sectionId: activeEnabledSection2.id,
          rank: 2,
          active: true
        });

        // Create an in-active SectionItem for Section#1
        const approvedItem3 = await createApprovedItemHelper(db, {
          title: 'Fake Item3!',
        });
        await createSectionItemHelper(db, {
          approvedItemId: approvedItem3.id,
          sectionId: activeEnabledSection1.id,
          rank: 3,
          active: false
        });

        // query Sectiondb to make sure there are 4 total sections
        const dbSections = await db.section.findMany();
        // Expect 4 sections in DB
        expect (dbSections.length).toEqual(4);
        // Now get the result from getSectionsWithSectionItems (public context)
        const result = await getSectionsWithSectionItems(db, true, ScheduledSurfacesEnum.NEW_TAB_EN_US);
        // 3 total active sections, but 1 Sectionis disabled
        // ONLY 2 enabled sections should be returned
        expect(result.length).toEqual(2);
        expect(result[0].externalId).toEqual(activeEnabledSection1.externalId);
        expect(result[1].externalId).toEqual(activeEnabledSection2.externalId);

        // Each returned Sectionshould have 1 active SectionItem in the array
        expect(result[0].sectionItems.length).toEqual(1); // Section#1 has 2 SectionItems, but only 1 is active
        expect(result[1].sectionItems.length).toEqual(1);
        // Check for correct SectionItems
        expect(result[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);
        expect(result[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
      });
      it('should return an empty array if there are no Sections found', async () => {
        // clear db
        await clearDb(db);

        const result = await getSectionsWithSectionItems(db, true, 'NEW_TAB_EN_US');

        expect(result).toEqual([]);
      });
    });

    describe('when using AdminContextManager', () => {
      it('should return all active Sections (including disabled ones) + SectionItems', async () => {
        // create a few active SectionItems
        const approvedItem1 = await createApprovedItemHelper(db, {
          title: 'Fake Item!',
        });
        const approvedItem2 = await createApprovedItemHelper(db, {
          title: 'Fake Item2!',
        });
        const sectionItem1 = await createSectionItemHelper(db, {
          approvedItemId: approvedItem1.id,
          sectionId: activeEnabledSection1.id,
          rank: 1,
          active: true
        });
        const sectionItem2 = await createSectionItemHelper(db, {
          approvedItemId: approvedItem2.id,
          sectionId: activeEnabledSection2.id,
          rank: 2,
          active: true
        });
        const sectionItem3 = await createSectionItemHelper(db, {
          approvedItemId: approvedItem2.id,
          sectionId: activeDisabledSection.id,
          rank: 2,
          active: true
        });

        // Create an in-active SectionItem for Section#1
        const approvedItem3 = await createApprovedItemHelper(db, {
          title: 'Fake Item3!',
        });
        await createSectionItemHelper(db, {
          approvedItemId: approvedItem3.id,
          sectionId: activeEnabledSection1.id,
          rank: 3,
          active: false
        });

        // query Sectiondb to make sure there are 4 total sections
        const dbSections = await db.section.findMany();
        // Expect 4 sections in DB
        expect (dbSections.length).toEqual(4);
        // Now get the result from getSectionsWithSectionItems (admin context)
        const result = await getSectionsWithSectionItems(db, false, ScheduledSurfacesEnum.NEW_TAB_EN_US);
        // 3 total active sections, 1 Sectionis disabled, 1 Sectionis in-active
        // ONLY 3 sections should be returned
        expect(result.length).toEqual(3);
        expect(result[0].externalId).toEqual(activeEnabledSection1.externalId);
        expect(result[1].externalId).toEqual(activeEnabledSection2.externalId);
        expect(result[2].externalId).toEqual(activeDisabledSection.externalId);

        // Each returned Sectionshould have 1 active SectionItem in the array
        expect(result[0].sectionItems.length).toEqual(1); // Section#1 has 2 SectionItems, but only 1 is active
        expect(result[1].sectionItems.length).toEqual(1);
        expect(result[2].sectionItems.length).toEqual(1); // Disabled Sectionshould still return its sectionItems
        // Check for correct SectionItems
        expect(result[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);
        expect(result[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
        expect(result[2].sectionItems[0].externalId).toEqual(sectionItem3.externalId);
      });
      it('should return an empty array if there are no Sections found', async () => {
        // clear db
        await clearDb(db);

        const result = await getSectionsWithSectionItems(db, false, 'NEW_TAB_EN_US');

        expect(result).toEqual([]);
      });
    });
  });
});
