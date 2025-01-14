import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { createSection, updateSection } from './Section';
import { createSectionHelper, createSectionItemHelper } from '../../test/helpers';
import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';

describe('Section', () => {
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

  describe('createSection', () => {
    it('should create a Section', async () => {
      const input = {
        externalId: 'njh-789',
        title: 'Fake Section Title',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        sort: 2,
        active: true
      };

      const result = await createSection(db, input);

      expect(result.externalId).toEqual('njh-789');
    });
  });

  describe('updateSection', () => {
    it('should update a Section & mark any associated SectionItems in-active', async () => {
      const approvedItem = await createApprovedItemHelper(db, {
        title: 'Fake Item!',
      });

      const section = await createSectionHelper(db, {externalId: 'oiueh-123', title: 'New Title'});

      const sectionItem = await createSectionItemHelper(db, {
        approvedItemId: approvedItem.id,
        sectionId: section.id,
        rank: 1
      });

      const input = {
        externalId: 'oiueh-123',
        title: 'Updating new title',
        scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
        createSource: ActivitySource.MANUAL,
        sort: 3,
        active: true
      };

      const result = await updateSection(db, input);

      expect(result.externalId).toEqual('oiueh-123');
      expect(result.title).toEqual('Updating new title');
      expect(result.sort).toEqual(3);

      const inactiveSectioinItem = await db.sectionItem.findUnique({
        where: {externalId: sectionItem.externalId}
      });
      // Expect associated section item to be in-active now
      expect(inactiveSectioinItem.active).toBeFalsy();
    });
  });
});
