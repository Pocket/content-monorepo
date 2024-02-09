import { ApprovedItem, ScheduledItem, PrismaClient } from '@prisma/client';
import { clearDb } from './clearDb';
import { createApprovedItemHelper } from './createApprovedItemHelper';
import {
  CreateScheduledItemHelperInput,
  createScheduledItemHelper,
} from './createScheduledItemHelper';
import { faker } from '@faker-js/faker';
import { ScheduledItemSource } from '../../shared/types';

const db = new PrismaClient();

describe('createScheduledItemHelper', () => {
  let approvedItem: ApprovedItem;
  let scheduledSurfaceGuid: string;

  beforeEach(async () => {
    await clearDb(db);

    approvedItem = await createApprovedItemHelper(db, {
      title: 'What even is time?',
    });
    scheduledSurfaceGuid = 'NEW_TAB_DE_DE';
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should create a scheduled item with required props supplied', async () => {
    const data: CreateScheduledItemHelperInput = {
      approvedItem,
      scheduledSurfaceGuid: scheduledSurfaceGuid,
    };

    const item: ScheduledItem = await createScheduledItemHelper(db, data);

    // Expect to see the data we passed to the helper
    expect(item.approvedItemId).toBe(approvedItem.id);
    expect(item.scheduledSurfaceGuid).toBe(scheduledSurfaceGuid);

    // Expect to see the remaining fields filled in for us
    expect(item.createdBy).toBeTruthy();
    expect(item.scheduledDate).toBeTruthy();
  });

  it('should create a scheduled item with all properties supplied', async () => {
    const data: CreateScheduledItemHelperInput = {
      createdBy: faker.helpers.fake('auth-provider|test@example.com'),
      scheduledDate: '2022-01-01T00:00:00.000Z',
      approvedItem,
      scheduledSurfaceGuid: scheduledSurfaceGuid,
      source: ScheduledItemSource.MANUAL,
    };

    const item: ScheduledItem = await createScheduledItemHelper(db, data);

    // Expect to see everything as specified to the helper
    expect(item.approvedItemId).toBe(approvedItem.id);
    expect(item.scheduledSurfaceGuid).toBe(scheduledSurfaceGuid);
    expect(item.createdBy).toBe(data.createdBy);
    expect(item.scheduledDate.toISOString()).toBe(data.scheduledDate);
    expect(item.source).toBe('MANUAL');
  });
});
