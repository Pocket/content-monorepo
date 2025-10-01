import { PrismaClient, Section} from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { getSectionsWithSectionItems } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';
import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';

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
    // Create active & enabled sections
    activeEnabledSection1 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});
    activeEnabledSection2 = await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true});
    // Create active + disabled section
    activeDisabledSection= await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: true, disabled: true});
    // Create in-active section
    await createSectionHelper(db, {scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US, active: false});
  });

  afterEach(async () => {
    jest.restoreAllMocks(); // clean Date.now mock
    await clearDb(db);
  });

  describe('getSectionsWithSectionItems', () => {
    describe('when using PublicContextManager', () => {
      it('should return ONLY LIVE, active & enabled Sections + SectionItems', async () => {
        // Mock currentDate to 2024-06-15
        const currentDate = new Date('2024-06-15T00:00:00Z');
        jest.spyOn(Date, 'now').mockReturnValue(currentDate.getTime());

        // Live ML section (should be returned)
        const liveMLSection = await createSectionHelper(db, {
          externalId: 'live-ML-section',
          scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
          createSource: ActivitySource.ML,
          active: true,
          disabled: false,
        });

        // Live custom section (should be returned)
        const liveCustomSection = await createSectionHelper(db, {
          externalId: 'live-custom-section',
          scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
          createSource: ActivitySource.MANUAL,
          active: true,
          disabled: false,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-20'),
        });

        // Scheduled section - not live yet (should not be returned)
        await createSectionHelper(db, {
          externalId: 'scheduled-section',
          scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
          createSource: ActivitySource.MANUAL,
          active: true,
          disabled: false,
          startDate: new Date('2024-06-25'),
        });

        // Expired section - already ended (should be excluded)
        await createSectionHelper(db, {
          externalId: 'expired-section',
          scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
          createSource: ActivitySource.MANUAL,
          active: true,
          disabled: false,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-10'),
        });

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

        // Create active item for live ML Section
        await createSectionItemHelper(db, {
          approvedItemId: approvedItem2.id,
          sectionId: liveMLSection.id,
          rank: 2,
          active: true
        });

        // Create active item for live Custom Section
        await createSectionItemHelper(db, {
          approvedItemId: approvedItem2.id,
          sectionId: liveCustomSection.id,
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
        expect (dbSections.length).toEqual(8);
        // Now get the result from getSectionsWithSectionItems (public context)
        const result = await getSectionsWithSectionItems(db, true, ScheduledSurfacesEnum.NEW_TAB_EN_US);
        // 7 total active sections, but
        // 1 Section is disabled
        // 1 Section is not live yet
        // 1 Section is already expired
        // ONLY 4 LIVE + active &  enabled sections should be returned
        expect(result.length).toEqual(4);

        const resultExternalIds = result.map((section) => section.externalId);

        expect(resultExternalIds).toContain(activeEnabledSection1.externalId);
        expect(resultExternalIds).toContain(activeEnabledSection2.externalId);
        expect(resultExternalIds).toContain('live-ML-section');
        expect(resultExternalIds).toContain('live-custom-section');
        // non-LIVE sections should not be in response
        expect(resultExternalIds).not.toContain('scheduled-section');
        expect(resultExternalIds).not.toContain('expired-section');

        // Each returned Sectionshould have 1 active SectionItem in the array
        expect(result[0].sectionItems.length).toEqual(1); // Section#1 has 2 SectionItems, but only 1 is active
        expect(result[1].sectionItems.length).toEqual(1);
        expect(result[2].sectionItems.length).toEqual(1);
        expect(result[2].externalId).toEqual('live-ML-section'); // ML live section is returned
        expect(result[3].sectionItems.length).toEqual(1);
        expect(result[3].externalId).toEqual('live-custom-section'); // Custom live section is returned
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
