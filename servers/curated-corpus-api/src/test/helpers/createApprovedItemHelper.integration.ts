import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { clearDb } from './clearDb';
import {
  createApprovedItemHelper,
  CreateApprovedItemHelperInput,
} from './createApprovedItemHelper';
import { CorpusItemSource, CuratedStatus } from 'content-common';

const db = new PrismaClient();

describe('createApprovedItemHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('creates an approved item with just the title supplied', async () => {
    const data: CreateApprovedItemHelperInput = { title: 'What even is time?' };

    const item = await createApprovedItemHelper(db, data);

    // Expect to see the title we passed to the helper
    expect(item.title).toEqual(data.title);

    // Expect to see the remaining fields filled in for us
    expect(item.externalId).toBeDefined();
    expect(item.prospectId).toBeDefined();
    expect(item.language).toBeDefined();
    expect(item.publisher).toBeDefined();
    expect(item.url).toBeDefined();
    expect(item.imageUrl).toBeDefined();
    expect(item.excerpt).toBeDefined();
    expect(item.status).toBeDefined();
    expect(item.topic).toBeDefined();
    expect(item.source).toBeDefined();
    expect(typeof item.isCollection).toBe('boolean');
    expect(typeof item.isTimeSensitive).toBe('boolean');
    expect(typeof item.isSyndicated).toBe('boolean');
  });

  it('creates a curated item with all properties supplied', async () => {
    const data: CreateApprovedItemHelperInput = {
      prospectId: '123-abc',
      title: 'What even is time?',
      excerpt: faker.lorem.sentences(3),
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      imageUrl: faker.image.url(),
      createdBy: 'big-company|name.surname@example.com',
      topic: 'Business',
      source: CorpusItemSource.PROSPECT,
      isCollection: false,
      isTimeSensitive: false,
      isSyndicated: true,
    };

    const item = await createApprovedItemHelper(db, data);

    // Expect to see everything as specified to the helper
    expect(item).toMatchObject(data);
  });
});
