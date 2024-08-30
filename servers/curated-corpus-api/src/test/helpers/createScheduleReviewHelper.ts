import { ScheduleReview, PrismaClient, Prisma } from '.prisma/client';
import { CreateScheduleReviewInput } from '../../database/types';
import { faker } from '@faker-js/faker';

/**
 * A helper function that creates an entry in the DB to imitate a curator
 * marking entries for a scheduled surface for a given date as human-reviewed.
 * @param prisma
 * @param data
 */
export async function createScheduleReviewHelper(
  prisma: PrismaClient,
  data: CreateScheduleReviewInput,
): Promise<ScheduleReview> {
  // Defaults for properties filled in by the API
  const today = new Date();
  // imitation auth0 user id
  const reviewer = faker.helpers.fake('{{hacker.noun}}|{{internet.email}}');

  const createScheduleReviewDefaults = {
    reviewedBy: reviewer,
    reviewedAt: today,
    createdAt: today,
  };

  // Convert date from YYYY-MM-DD to the format accepted by Prisma
  data.scheduledDate = new Date(data.scheduledDate).toISOString();

  const inputs: Prisma.ScheduleReviewCreateInput = {
    ...createScheduleReviewDefaults,
    ...data,
  };

  return prisma.scheduleReview.create({ data: inputs });
}
