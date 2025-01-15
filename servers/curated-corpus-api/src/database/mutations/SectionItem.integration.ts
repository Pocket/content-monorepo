import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb } from '../../test/helpers';
import { createSectionItem } from './SectionItem';
import { createApprovedItemHelper } from '../../test/helpers';
import { createSectionHelper } from '../../test/helpers';

describe('SectionItem', () => {
  let db: PrismaClient;

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
});
