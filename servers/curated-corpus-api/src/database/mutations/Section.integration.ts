import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { createSection, disableEnableSection, updateSection } from './Section';
import {
  createSectionHelper,
  createSectionItemHelper,
} from '../../test/helpers';
import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';
import { IABMetadata } from 'content-common';

describe('Section', () => {
  let db: PrismaClient;
  // january 1, 3030
  const newDateMock = new Date(3030, 0, 1, 10, 0, 0, 0);

  beforeAll(async () => {
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);
  });

  describe('createSection', () => {
    it('should create a Section', async () => {
      const iabMetadata: IABMetadata = {
        taxonomy: "IAB-3.0",
        categories: ["488"]
      };

      const input = {
        externalId: 'njh-789',
        title: 'Fake Section Title',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        iab: iabMetadata,
        createSource: ActivitySource.MANUAL,
        sort: 2,
        active: true,
      };

      const result = await createSection(db, input);

      expect(result.externalId).toEqual('njh-789');
    });
  });

  describe('updateSection', () => {
    it('should update a Section & leave any associated active SectionItems untouched. Existing in-active SectionItems should not be updated.', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });

      const section = await createSectionHelper(db, {
        externalId: 'oiueh-123',
        title: 'New Title',
      });

      const sectionItem = await createSectionItemHelper(db, {
        approvedItemId: approvedItem.id,
        sectionId: section.id,
        rank: 1,
      });

      let sectionItem2 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem.id,
        sectionId: section.id,
        rank: 2,
      });

      // track the original date sectionItem2 was deactivated
      const originalDeactivatedAtDate = new Date(2020, 0, 1, 10, 0, 0, 0);

      // make this SectionItem inactive prior to updating the Section
      sectionItem2 = await db.sectionItem.update({
        where: { externalId: sectionItem2.externalId },
        data: {
          active: false,
          deactivateSource: ActivitySource.ML,
          deactivatedAt: originalDeactivatedAtDate,
        },
      });

      const sectionItemUpdatedAt1 = sectionItem.updatedAt;
      const sectionItemUpdatedAt2 = sectionItem2.updatedAt;

      const input = {
        externalId: 'oiueh-123',
        title: 'Updating new title',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        sort: 3,
        active: true,
      };

      const result = await updateSection(db, input, section.id);

      expect(result.externalId).toEqual('oiueh-123');
      expect(result.title).toEqual('Updating new title');
      // exepct deactivateSource to be null
      expect(result.deactivateSource).toBeNull();
      expect(result.sort).toEqual(3);

      // Active item remains active and unchanged
      const stillActive = result.sectionItems.find(
        item => item.externalId === sectionItem.externalId
      );
      expect(stillActive.active).toBe(true);
      expect(stillActive.updatedAt).toEqual(sectionItemUpdatedAt1);
      expect(stillActive.deactivateSource).toBeNull();
      expect(stillActive.deactivatedAt).toBeNull();

      // Expect alredy in-active section item to not be updated
      const inactiveSectioinItem2 = await db.sectionItem.findUnique({
        where: { externalId: sectionItem2.externalId },
      });

      expect(inactiveSectioinItem2.active).toBeFalsy();
      // updatedAt should not be changed
      expect(inactiveSectioinItem2.updatedAt).toEqual(sectionItemUpdatedAt2);
    });

    it('should update a Section & set deactivateSource to ML and deactivatedAt if active is false', async () => {
      const iabMetadata: IABMetadata = {
        taxonomy: "IAB-3.0",
        categories: ["488"]
      };

      const section = await createSectionHelper(db, {
        externalId: 'yu3ruib-123',
        title: 'New Title',
      });

      const input = {
        externalId: 'yu3ruib-123',
        title: 'Updating new title',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        iab: iabMetadata,
        createSource: ActivitySource.MANUAL,
        sort: 3,
        active: false,
      };

      // control what `new Date()` returns in the update below so we can
      // strictly test the resulting values
      jest.useFakeTimers({
        now: newDateMock,
        advanceTimers: false,
      });

      const result = await updateSection(db, input, section.id);

      // stop controlling `new Date()`
      jest.useRealTimers();

      expect(result.externalId).toEqual('yu3ruib-123');
      expect(result.title).toEqual('Updating new title');
      expect(result.iab).toEqual(iabMetadata);
      // exepct deactivateSource to be set to ML, as active == false
      expect(result.deactivateSource).toEqual(ActivitySource.ML);
      expect(result.deactivatedAt).toEqual(newDateMock);
      expect(result.sort).toEqual(3);
    });
  });

  describe('disableEnableSection', () => {
    it('should disable a Section', async () => {
      await createSectionHelper(db, {
        externalId: 'active-123',
        title: 'New Title',
      });

      const input = {
        externalId: 'active-123',
        disabled: true
      };

      const result = await disableEnableSection(db, input);

      expect(result.externalId).toEqual('active-123');
      expect(result.disabled).toBeTruthy();
    });
    it('should enable a Section', async () => {
      await createSectionHelper(db, {
        externalId: 'active-890',
        title: 'New Title',
        disabled: true
      });
      const input = {
        externalId: 'active-890',
        disabled: false
      };

      const result = await disableEnableSection(db, input);

      expect(result.externalId).toEqual('active-890');
      expect(result.disabled).toBeFalsy();
    });
  });
});
