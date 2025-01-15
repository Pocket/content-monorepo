import { PrismaClient, Section, ApprovedItem, SectionItem } from '.prisma/client';

import { ActivitySource } from 'content-common';

import { clearDb } from './clearDb';
import {
  createSectionItemHelper,
  CreateSectionItemHelperInput,
} from './createSectionItemHelper';
import { createSectionHelper } from './createSectionHelper'
import { createApprovedItemHelper } from './createApprovedItemHelper';

const db = new PrismaClient();
let section: Section;
let approvedItem: ApprovedItem;

describe('createSectionItemHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
    section = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
    });
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });
  });

  afterAll(async () => {
    await clearDb(db);
    await db.$disconnect();
  });

  it('should create a SectionItem with no rank supplied', async () => {
    const data: CreateSectionItemHelperInput = {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
    };

    const sectionItem: SectionItem = await createSectionItemHelper(db, data);

    // just make sure a record was created
    expect(sectionItem.externalId).not.toBeFalsy();
  });

  it('should create a SectionItem with all props supplied', async () => {
    const data: CreateSectionItemHelperInput = {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
      rank: 1
    };

    const sectionItem: SectionItem = await createSectionItemHelper(db, data);

    // make sure props specified make it to the db
    expect(sectionItem.approvedItemId).toEqual(approvedItem.id);
    expect(sectionItem.sectionId).toEqual(section.id);
    expect(sectionItem.rank).toEqual(data.rank);
  });
});
