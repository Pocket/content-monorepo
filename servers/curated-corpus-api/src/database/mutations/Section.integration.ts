import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import {
  createCustomSection,
  createSection,
  deleteCustomSection,
  disableEnableSection,
  updateSection,
  updateCustomSection
} from './Section';
import {
  createSectionHelper,
  createSectionItemHelper,
} from '../../test/helpers';
import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';
import { IABMetadata } from 'content-common';
import { CreateCustomSectionInput, UpdateCustomSectionInput } from '../types';

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
        description: 'Fake section description',
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
        description: 'Fake description'
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
        description: 'Updating new description',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        sort: 3,
        active: true,
      };

      const result = await updateSection(db, input, section.id);

      expect(result.externalId).toEqual('oiueh-123');
      expect(result.title).toEqual('Updating new title');
      expect(result.description).toEqual('Updating new description');
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

  describe('createCustomSection', () => {
    it('should create a Custom Editorial Section with all required + optional metadata', async () => {
      const iabMetadata: IABMetadata = {
        taxonomy: "IAB-3.0",
        categories: ["488"]
      };

      const input: CreateCustomSectionInput = {
        title: 'Fake Custom Section Title',
        description: 'fake custom section description',
        heroTitle: 'fake hero title',
        heroDescription: 'hero description',
        startDate: '2025-01-01',
        endDate: '2025-01-15',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        iab: iabMetadata,
        createSource: ActivitySource.MANUAL,
        sort: 2,
        active: true,
        disabled: false
      };

      const result = await createCustomSection(db, input);

      expect(result.title).toEqual('Fake Custom Section Title');
      expect(result.description).toEqual('fake custom section description');
      expect(result.heroTitle).toEqual('fake hero title');
      expect(result.heroDescription).toEqual('hero description');
      expect(result.startDate.toISOString()).toEqual(new Date('2025-01-01').toISOString());
      expect(result.endDate.toISOString()).toEqual(new Date('2025-01-15').toISOString());
    });

    it('should create a Custom Editorial Section with only required metadata', async () => {
      const input: CreateCustomSectionInput = {
        title: 'Fake Custom Section Title',
        description: 'fake custom section description',
        startDate: '2025-01-01',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        active: true,
        disabled: false
      };

      const result = await createCustomSection(db, input);

      expect(result.title).toEqual('Fake Custom Section Title');
    });
  });

  describe('deleteCustomSection', () => {
    it('should safe-delete a Section - mark it in-active, set deactivatedAt & deactivateSource', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });

      const section = await createSectionHelper(db, {});

      const sectionItem = await createSectionItemHelper(db, {
        approvedItemId: approvedItem.id,
        sectionId: section.id,
        rank: 1,
        active: true,
      });

      // control what `new Date()` returns in the update below so we can
      // strictly test the resulting values
      jest.useFakeTimers({
        now: newDateMock,
        advanceTimers: false,
      });

      const result = await deleteCustomSection(db, section.id, section.externalId);

      // stop controlling `new Date()`
      jest.useRealTimers();

      // Lookup in-active sectionItem
      const inactiveSectioinItem = await db.sectionItem.findUnique({
        where: { externalId: sectionItem.externalId },
      });

      expect(result.externalId).toEqual(section.externalId);
      expect(result.active).toBeFalsy();
      expect(inactiveSectioinItem.externalId).toEqual(sectionItem.externalId);
      expect(inactiveSectioinItem.active).toBeFalsy();
      expect(result.deactivateSource).toEqual(ActivitySource.MANUAL);
      expect(result.deactivatedAt).toEqual(newDateMock);
    });
  });

  describe('updateCustomSection', () => {
    it('should update a Custom Editorial Section with all fields', async () => {
      // First create a custom section
      const createInput: CreateCustomSectionInput = {
        title: 'Original Title',
        description: 'Original Description',
        heroTitle: 'Original Hero Title',
        heroDescription: 'Original Hero Description',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['1'],
        },
        createSource: ActivitySource.MANUAL,
        sort: 10,
        active: true,
        disabled: false,
      };

      const createdSection = await createCustomSection(db, createInput);

      // Now update it with all fields
      const updateInput: UpdateCustomSectionInput = {
        externalId: createdSection.externalId,
        title: 'Updated Title',
        description: 'Updated Description',
        heroTitle: 'Updated Hero Title',
        heroDescription: 'Updated Hero Description',
        startDate: '2025-02-01',
        endDate: '2025-12-31',
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['2', '3'],
        },
        sort: 20,
        updateSource: ActivitySource.MANUAL,
      };

      const result = await updateCustomSection(db, updateInput);

      expect(result.externalId).toEqual(createdSection.externalId);
      expect(result.title).toEqual('Updated Title');
      expect(result.description).toEqual('Updated Description');
      expect(result.heroTitle).toEqual('Updated Hero Title');
      expect(result.heroDescription).toEqual('Updated Hero Description');
      expect(result.startDate.toISOString()).toEqual(new Date('2025-02-01').toISOString());
      expect(result.endDate.toISOString()).toEqual(new Date('2025-12-31').toISOString());
      expect(result.iab).toEqual({
        taxonomy: 'IAB-3.0',
        categories: ['2', '3'],
      });
      expect(result.sort).toEqual(20);
      expect(result.createSource).toEqual(ActivitySource.MANUAL); // Should not change
    });

    it('should update a Custom Editorial Section with partial fields', async () => {
      // First create a custom section with all fields
      const createInput: CreateCustomSectionInput = {
        title: 'Original Title',
        description: 'Original Description',
        heroTitle: 'Original Hero Title',
        heroDescription: 'Original Hero Description',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['1'],
        },
        createSource: ActivitySource.MANUAL,
        sort: 10,
        active: true,
        disabled: false,
      };

      const createdSection = await createCustomSection(db, createInput);

      // Update with only required fields
      const updateInput: UpdateCustomSectionInput = {
        externalId: createdSection.externalId,
        title: 'Partially Updated Title',
        description: 'Partially Updated Description',
        startDate: '2025-03-01',
        updateSource: ActivitySource.MANUAL,
      };

      const result = await updateCustomSection(db, updateInput);

      expect(result.externalId).toEqual(createdSection.externalId);
      expect(result.title).toEqual('Partially Updated Title');
      expect(result.description).toEqual('Partially Updated Description');
      expect(result.startDate.toISOString()).toEqual(new Date('2025-03-01').toISOString());
      // These should remain unchanged
      expect(result.heroTitle).toEqual('Original Hero Title');
      expect(result.heroDescription).toEqual('Original Hero Description');
      expect(result.endDate.toISOString()).toEqual(new Date('2025-06-30').toISOString());
      expect(result.sort).toEqual(10);
      expect(result.iab).toEqual({
        taxonomy: 'IAB-3.0',
        categories: ['1'],
      });
    });

    it('should clear optional fields when set to null', async () => {
      // First create a custom section with optional fields
      const createInput: CreateCustomSectionInput = {
        title: 'Original Title',
        description: 'Original Description',
        heroTitle: 'Original Hero Title',
        heroDescription: 'Original Hero Description',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        active: true,
        disabled: false,
      };

      const createdSection = await createCustomSection(db, createInput);

      // Update with null values for optional fields
      const updateInput: UpdateCustomSectionInput = {
        externalId: createdSection.externalId,
        title: 'Title with nulls',
        description: 'Description',
        startDate: '2025-01-01',
        endDate: null,
        heroTitle: null,
        heroDescription: null,
        updateSource: ActivitySource.MANUAL,
      };

      const result = await updateCustomSection(db, updateInput);

      expect(result.externalId).toEqual(createdSection.externalId);
      expect(result.title).toEqual('Title with nulls');
      expect(result.endDate).toBeNull();
      expect(result.heroTitle).toBeNull();
      expect(result.heroDescription).toBeNull();
    });

    it('should include active SectionItems in the response', async () => {
      // Create a custom section
      const createInput: CreateCustomSectionInput = {
        title: 'Section with Items',
        description: 'Description',
        startDate: '2025-01-01',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        active: true,
        disabled: false,
      };

      const createdSection = await createCustomSection(db, createInput);

      // Create approved items and section items
      const approvedItem1 = await createApprovedItemHelper(db, {
        title: 'Item 1',
      });
      const approvedItem2 = await createApprovedItemHelper(db, {
        title: 'Item 2',
      });

      await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: createdSection.id,
        rank: 1,
        active: true,
      });

      await createSectionItemHelper(db, {
        approvedItemId: approvedItem2.id,
        sectionId: createdSection.id,
        rank: 2,
        active: false,
      });

      // Update the section
      const updateInput: UpdateCustomSectionInput = {
        externalId: createdSection.externalId,
        title: 'Updated Section with Items',
        description: 'Updated Description',
        startDate: '2025-02-01',
        updateSource: ActivitySource.MANUAL,
      };

      const result = await updateCustomSection(db, updateInput);

      expect(result.title).toEqual('Updated Section with Items');
      expect(result.sectionItems).toHaveLength(1); // Only active items
      expect(result.sectionItems[0].active).toBe(true);
      expect(result.sectionItems[0].approvedItem.title).toEqual('Item 1');
    });

    it('should preserve fields not included in the update', async () => {
      // Create a section with specific values
      const createInput: CreateCustomSectionInput = {
        title: 'Original Title',
        description: 'Original Description',
        startDate: '2025-01-01',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        sort: 42,
        active: true,
        disabled: false,
      };

      const createdSection = await createCustomSection(db, createInput);

      // Update only the title
      const updateInput: UpdateCustomSectionInput = {
        externalId: createdSection.externalId,
        title: 'New Title Only',
        description: 'Original Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
      };

      const result = await updateCustomSection(db, updateInput);

      expect(result.title).toEqual('New Title Only');
      expect(result.sort).toEqual(42); // Should remain unchanged
      expect(result.active).toBe(true); // Should remain unchanged
      expect(result.disabled).toBe(false); // Should remain unchanged
      expect(result.scheduledSurfaceGuid).toEqual(ScheduledSurfacesEnum.NEW_TAB_EN_US); // Should remain unchanged
    });
  });
});
