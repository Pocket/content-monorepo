import { PrismaClient, Section } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { getSectionWithSectionItems } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';

describe('Section', () => {
  let db: PrismaClient;
  let section: Section;

  beforeAll(async () => {
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);
    section = await createSectionHelper(db, {});
  });

  describe('getSectionWithSectionItems', () => {
    it('should retrieve a Section', async () => {
      const result = await getSectionWithSectionItems(db, section.externalId);

      expect(result.externalId).toEqual(section.externalId);
    });
    it('should retrieve a Section with its SectionItems', async () => {
      // create a few SectionItems
      const approvedItem1 = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });
      const approvedItem2 = await createApprovedItemHelper(db, {
        title: 'Fake Item2!',
      });
      const sectionItem1 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: section.id,
        rank: 1
      });
      const sectionItem2 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem2.id,
        sectionId: section.id,
        rank: 2
      });

      const result = await getSectionWithSectionItems(db, section.externalId);

      expect(result.externalId).toEqual(section.externalId);
      expect(result.sectionItems.length).toEqual(2);
      expect(result.sectionItems[0].externalId).toEqual(sectionItem1.externalId);
      expect(result.sectionItems[1].externalId).toEqual(sectionItem2.externalId);
    });
    it('should return null if Section externalId not found', async () => {
      const result = await getSectionWithSectionItems(db, 'fake-external-id');

      expect(result).toBeNull()
    });
  });
});
