import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb, createSectionItemHelper } from '../../test/helpers';
import { createSectionItem, removeSectionItem } from './SectionItem';
import { createApprovedItemHelper } from '../../test/helpers';
import { createSectionHelper } from '../../test/helpers';
import { ActivitySource } from 'content-common';

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
  });

  describe('removeSectionItem', () => {
    it('should remove a SectionItem from a Section - mark it in-active & set deactivatedAt & deactivateSource', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });

      const section = await createSectionHelper(db, {});

      const sectionItem = await createSectionItemHelper(db, {
        approvedItemId: approvedItem.id,
        sectionId: section.id,
        rank: 1,
        active: true
      });


      // control what `new Date()` returns in the update below so we can
      // strictly test the resulting values
      jest.useFakeTimers({
        now: newDateMock,
        advanceTimers: false,
      });

      const result = await removeSectionItem(db, sectionItem.externalId);

      // stop controlling `new Date()`
      jest.useRealTimers();
      
      expect(result.externalId).toEqual(sectionItem.externalId);
      expect(result.active).toBeFalsy();
      expect(result.deactivateSource).toEqual(ActivitySource.MANUAL);
      expect(result.deactivatedAt).toEqual(newDateMock);
    });
  });
});
