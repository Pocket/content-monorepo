import { PrismaClient } from '.prisma/client';

import { client } from '../client';
import { clearDb } from '../../test/helpers';
import { createScheduleReview } from './ScheduleReview';

describe('ScheduleReview', () => {
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

  describe('createScheduleReview', () => {
    it('should create a schedule review if one does not exist', async () => {
      const result = await createScheduleReview(
        db,
        {
          scheduledSurfaceGuid: 'NEW_TAB_EN_US',
          scheduledDate: '2025-01-01',
        },
        'curator|ldap',
      );

      expect(result.scheduledSurfaceGuid).toStrictEqual('NEW_TAB_EN_US');
      expect(result.scheduledDate).toStrictEqual('2025-01-01');
      expect(result.reviewedBy).toStrictEqual('curator|ldap');
      // Let's not get into precise date comparisons here:
      // it is enough to know that this field is not empty
      expect(result.reviewedAt).not.toBeNull();
    });
  });
});
