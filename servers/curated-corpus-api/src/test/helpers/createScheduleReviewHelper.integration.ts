import { ScheduleReview, PrismaClient } from '.prisma/client';
import { clearDb } from './clearDb';
import { createScheduleReviewHelper } from './createScheduleReviewHelper';
import { CreateScheduleReviewInput } from '../../database/types';

const db = new PrismaClient();

describe('createScheduleReviewHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should create a schedule review entry with required props supplied', async () => {
    const data: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
      scheduledDate: '2025-01-01',
    };

    const entry: ScheduleReview = await createScheduleReviewHelper(db, data);

    // Expect to see the data we passed to the helper
    expect(entry.scheduledSurfaceGuid).toBe(data.scheduledSurfaceGuid);
    expect(entry.scheduledDate.toISOString()).toBe(data.scheduledDate);

    // Expect to see the remaining fields filled in for us
    expect(entry.reviewedBy).toBeTruthy();
    expect(entry.reviewedAt).toBeTruthy();
    expect(entry.createdAt).toBeTruthy();
    expect(entry.updatedAt).toBeTruthy();
  });
});
