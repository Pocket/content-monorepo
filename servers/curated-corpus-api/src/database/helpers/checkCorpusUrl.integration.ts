import { UserInputError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '.prisma/client';
import { checkCorpusUrl } from './checkCorpusUrl';
import { client } from '../client';
import { clearDb, createApprovedItemHelper, createRejectedCuratedCorpusItemHelper } from '../../test/helpers';

describe('checkCorpusUrl', () => {
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

  it('should throw UserInputError if url exists in approved items', async () => {
    const url = 'https://test.com/approved';

    //create approved item
    await createApprovedItemHelper(db, {
      title: 'test approved item',
      url,
    });

    await expect(checkCorpusUrl(db, url)).rejects.toThrow(UserInputError);

  });

  it('should throw UserInputError if url exists in rejected items', async () => {
    const url = 'https://test.com/rejected';

    //create approved item
    await createRejectedCuratedCorpusItemHelper(db, {
      title: 'test rejected item',
      url,
    });

    await expect(checkCorpusUrl(db, url)).rejects.toThrow(UserInputError);

  })
});

