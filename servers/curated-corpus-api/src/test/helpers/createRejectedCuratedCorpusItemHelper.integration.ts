import { PrismaClient } from '@prisma/client';
import { expect } from 'chai';
import { clearDb } from './clearDb';
import {
  createRejectedCuratedCorpusItemHelper,
  CreateRejectedCuratedCorpusItemHelperInput,
} from './createRejectedCuratedCorpusItemHelper';

const db = new PrismaClient();

describe('createRejectedCuratedCorpusItemHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('creates a rejected item with just the title supplied', async () => {
    const data: CreateRejectedCuratedCorpusItemHelperInput = {
      title: 'Never Suffer From PHP Again',
    };

    const item = await createRejectedCuratedCorpusItemHelper(db, data);

    // Expect to see the title we passed to the helper
    expect(item.title).to.equal(data.title);

    // Expect to see the remaining fields filled in for us
    expect(item.externalId).to.exist;
    expect(item.prospectId).to.exist;
    expect(item.url).to.exist;
    expect(item.topic).to.exist;
    expect(item.publisher).to.exist;
    expect(item.language).to.exist;
    expect(item.reason).to.exist;
  });

  it('creates a curated item with all properties supplied', async () => {
    const data: CreateRejectedCuratedCorpusItemHelperInput = {
      prospectId: 'abc-123',
      url: 'https://www.test.com/',
      title: 'Never Suffer From PHP Again',
      topic: 'Business',
      publisher: 'Any Publisher',
      language: 'EN',
      reason: 'unspecified',
    };

    const item = await createRejectedCuratedCorpusItemHelper(db, data);

    // Expect to see everything as specified to the helper
    expect(item).to.deep.include(data);
  });
});
