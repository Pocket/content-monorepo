import {
  ApprovedItem,
  ScheduledItem,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ScheduledItemSource } from '../../shared/types';

// the data required to create a scheduled item that goes onto a scheduled surface
interface CreateScheduledItemHelperRequiredInput {
  approvedItem: ApprovedItem;
}

// optional information you can provide when creating a scheduled item
interface CreateScheduledItemHelperOptionalInput {
  createdBy: string;
  scheduledSurfaceGuid: string;
  scheduledDate: string;
  source: ScheduledItemSource;
}

// the input type the helper function expects - a combo of required and optional parameters
export type CreateScheduledItemHelperInput =
  CreateScheduledItemHelperRequiredInput &
    Partial<CreateScheduledItemHelperOptionalInput>;

/**
 * A helper function that creates a sample scheduled item to go onto a scheduled surface
 * for testing or local development.
 * @param prisma
 * @param data
 */
export async function createScheduledItemHelper(
  prisma: PrismaClient,
  data: CreateScheduledItemHelperInput,
): Promise<ScheduledItem> {
  // defaults for optional properties
  const createScheduledItemDefaults = {
    createdAt: faker.date.recent({ days: 14 }),
    createdBy: faker.helpers.fake('{{hacker.noun}}|{{internet.email}}'), // imitation auth0 user id
    scheduledDate: faker.helpers.arrayElement([
      faker.date.soon({ days: 7 }).toISOString(),
      faker.date.recent({ days: 7 }).toISOString(),
    ]),
    scheduledSurfaceGuid: 'NEW_TAB_EN_US',
  };

  const inputs: Prisma.ScheduledItemCreateInput = {
    ...createScheduledItemDefaults,
    ...data,
    approvedItem: { connect: { id: data.approvedItem.id } },
  };

  return await prisma.scheduledItem.create({
    data: inputs,
  });
}
