import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb, createSectionItemHelper } from '../../test/helpers';
import {
  createSectionItem,
  deleteSectionItemsByApprovedItemId,
  removeSectionItem,
} from './SectionItem';
import { createApprovedItemHelper } from '../../test/helpers';
import { createSectionHelper } from '../../test/helpers';
import { ActivitySource, SectionItemRemovalReason } from 'content-common';

describe('SectionItem', () => {
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

  describe('createSectionItem', () => {
    it('should create a SectionItem', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });

      const section = await createSectionHelper(db, {});

      const result = await createSectionItem(db, {
        sectionId: section.id,
        approvedItemExternalId: approvedItem.externalId,
      });

      expect(result.sectionId).toEqual(section.id);
      expect(result.approvedItemId).toEqual(approvedItem.id);
    });

    it('should block ML from re-adding a manually removed item', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Test Item',
      });

      const section1 = await createSectionHelper(db, {});
      const section2 = await createSectionHelper(db, {});

      // Create a SectionItem that was manually removed
      await db.sectionItem.create({
        data: {
          approvedItemId: approvedItem.id,
          sectionId: section1.id,
          rank: 1,
          active: false,
          deactivateSource: ActivitySource.MANUAL,
          deactivatedAt: new Date(),
          deactivateReasons: JSON.stringify(['DATED']),
        },
      });

      // ML should be blocked from adding this item to ANY section
      await expect(
        createSectionItem(
          db,
          {
            sectionId: section2.id,
            approvedItemExternalId: approvedItem.externalId,
          },
          ActivitySource.ML,
        ),
      ).rejects.toThrow(
        'Cannot create section item: This item was previously removed manually and cannot be re-added by ML.',
      );
    });

    it('should allow manual users to re-add a manually removed item', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Test Item',
      });

      const section = await createSectionHelper(db, {});

      // Create a SectionItem that was manually removed
      await db.sectionItem.create({
        data: {
          approvedItemId: approvedItem.id,
          sectionId: section.id,
          rank: 1,
          active: false,
          deactivateSource: ActivitySource.MANUAL,
          deactivatedAt: new Date(),
          deactivateReasons: JSON.stringify(['DATED']),
        },
      });

      // Manual users should be able to re-add the item
      const result = await createSectionItem(
        db,
        {
          sectionId: section.id,
          approvedItemExternalId: approvedItem.externalId,
        },
        ActivitySource.MANUAL,
      );

      expect(result.sectionId).toEqual(section.id);
      expect(result.approvedItemId).toEqual(approvedItem.id);
    });

    it('should allow ML to re-add an ML-removed item', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Test Item',
      });

      const section = await createSectionHelper(db, {});

      // Create a SectionItem that was removed by ML
      await db.sectionItem.create({
        data: {
          approvedItemId: approvedItem.id,
          sectionId: section.id,
          rank: 1,
          active: false,
          deactivateSource: ActivitySource.ML,
          deactivatedAt: new Date(),
          deactivateReasons: JSON.stringify(['ML']),
        },
      });

      // ML should be able to re-add the item
      const result = await createSectionItem(
        db,
        {
          sectionId: section.id,
          approvedItemExternalId: approvedItem.externalId,
        },
        ActivitySource.ML,
      );

      expect(result.sectionId).toEqual(section.id);
      expect(result.approvedItemId).toEqual(approvedItem.id);
    });
  });

  describe('removeSectionItem', () => {
    it('should remove a SectionItem from a Section - mark it in-active, set deactivatedAt, deactivateSource & deactivateReasons', async () => {
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

      const input = {
        externalId: sectionItem.externalId,
        deactivateReasons: [
          SectionItemRemovalReason.DATED,
          SectionItemRemovalReason.CONTROVERSIAL,
        ],
      };

      const result = await removeSectionItem(db, input);

      // stop controlling `new Date()`
      jest.useRealTimers();

      expect(result.externalId).toEqual(sectionItem.externalId);
      expect(result.active).toBeFalsy();
      expect(result.deactivateSource).toEqual(ActivitySource.MANUAL);
      expect(result.deactivatedAt).toEqual(newDateMock);
      expect(result.deactivateReasons).toEqual(input.deactivateReasons);
    });
  });

  describe('deleteSectionItemsByApprovedItemId', () => {
    it('should delete all SectionItems associated with the given approvedItemId', async () => {
      // create two ApprovedItems
      const approvedItem1 = await createApprovedItemHelper(db, {
        title: 'Fake Item 1!',
      });

      const approvedItem2 = await createApprovedItemHelper(db, {
        title: 'Fake Item 1!',
      });

      // create a couple Sections
      const section1 = await createSectionHelper(db, {});
      const section2 = await createSectionHelper(db, {});

      // add two SectionItems to section1

      // this SectionItem points to approvedItem1 and should be deleted in the db call below
      await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: section1.id,
        rank: 1,
        active: true,
      });

      // this SectionItem points to approvedItem2 and should *NOT* be deleted in the db call below
      await createSectionItemHelper(db, {
        approvedItemId: approvedItem2.id,
        sectionId: section1.id,
        rank: 1,
        active: true,
      });

      // add a SectionItems to section2

      // this SectionItem points to approvedItem1 and should be deleted in the db call below
      await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: section2.id,
        rank: 1,
        active: true,
      });

      await deleteSectionItemsByApprovedItemId(db, approvedItem1.id);

      // to verify the call above, retrieve all SectionItems associated with either ApprovedItem
      const sectionItems = await db.sectionItem.findMany({
        where: {
          approvedItemId: {
            in: [approvedItem1.id, approvedItem2.id],
          },
        },
      });

      // there should only be one SectionItem left...
      expect(sectionItems.length).toBe(1);

      // ...and it should be associated to approvedItem2
      expect(sectionItems[0].approvedItemId).toEqual(approvedItem2.id);
    });
  });
});
