import { PrismaClient, Section } from '.prisma/client';

import { ActivitySource, ScheduledSurfacesEnum } from 'content-common';

import { clearDb } from './clearDb';
import {
  createSectionHelper,
  CreateSectionHelperOptionalInput,
} from './createSectionHelper';

const db = new PrismaClient();

describe('createSectionHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should create a Section with no props supplied', async () => {
    const data: CreateSectionHelperOptionalInput = {};

    const section: Section = await createSectionHelper(db, data);

    // just make sure a record was created
    expect(section.externalId).not.toBeFalsy();
  });

  it('should create a Section with all props supplied', async () => {
    const data: CreateSectionHelperOptionalInput = {
      createSource: ActivitySource.ML,
      externalId: 'AnExternalIdFromML',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      title: 'How to Build Community',
      description: 'a small description here'
    };

    const section: Section = await createSectionHelper(db, data);

    // make sure props specified make it to the db
    expect(section.createSource).toEqual(data.createSource);
    expect(section.externalId).toEqual(data.externalId);
    expect(section.scheduledSurfaceGuid).toEqual(data.scheduledSurfaceGuid);
    expect(section.title).toEqual(data.title);
    expect(section.description).toEqual(data.description);
  });
});
