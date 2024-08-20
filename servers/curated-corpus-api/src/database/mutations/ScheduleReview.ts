import { PrismaClient, ScheduleReview } from '.prisma/client';
import { CreateScheduleReviewInput } from '../types';

/**
 * This mutation marks a given scheduled surface as reviewed
 * on the given date by a human curator.
 *
 * @param db
 * @param data
 * @param username
 */
export async function createScheduleReview(
  db: PrismaClient,
  data: CreateScheduleReviewInput,
  username: string,
): Promise<ScheduleReview> {
  const { scheduledSurfaceGuid, scheduledDate } = data;

  return db.scheduleReview.create({
    data: {
      scheduledSurfaceGuid,
      scheduledDate,
      reviewedBy: username,
      reviewedAt: new Date(),
    },
  });
}
