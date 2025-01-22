import { PrismaClient, Section } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { getSectionsWithSectionItems } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';

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
    section1 = await createSectionHelper(db, {});
    section2 = await createSectionHelper(db, {});
  });

  describe('getSectionsWithSectionItems', () => {
    it('should retrieve all Sections', async () => {
      const result = await getSectionsWithSectionItems(db);

      // There should be 2 Sections returned in the array
      expect(result.length).toEqual(2);
      expect(result[0].externalId).toEqual(section1.externalId);
      expect(result[1].externalId).toEqual(section2.externalId);
    });
    it('should retrieve all Sections with their corresponding SectionItems', async () => {
      // create a few SectionItems
      const approvedItem1 = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });
      const approvedItem2 = await createApprovedItemHelper(db, {
        title: 'Fake Item2!',
      });
      const sectionItem1 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem1.id,
        sectionId: section1.id,
        rank: 1
      });
      const sectionItem2 = await createSectionItemHelper(db, {
        approvedItemId: approvedItem2.id,
        sectionId: section2.id,
        rank: 2
      });

      const result = await getSectionsWithSectionItems(db);

      // There should be 2 Sections returned in the array
      expect(result.length).toEqual(2);
      // Each Section should have 1 SectionItem in the array
      expect(result[0].sectionItems.length).toEqual(1);
      expect(result[1].sectionItems.length).toEqual(1);
      // Check for correct SectionItems
      expect(result[0].sectionItems[0].externalId).toEqual(sectionItem1.externalId);
      expect(result[1].sectionItems[0].externalId).toEqual(sectionItem2.externalId);
    });
    it('should return an empty array if there are no Sections found', async () => {
      // clear db
      await clearDb(db);

      const result = await getSectionsWithSectionItems(db);

      expect(result).toEqual([]);
    });
  });
});
