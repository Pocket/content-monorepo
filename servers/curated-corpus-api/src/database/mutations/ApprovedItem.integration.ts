import { PrismaClient } from '.prisma/client';

import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
} from 'content-common';

import { client } from '../client';

import { clearDb, createApprovedItemHelper } from '../../test/helpers';
import { CreateApprovedItemInput } from '../types';
import { createApprovedItem, deleteApprovedItem } from './ApprovedItem';
import * as SectionItem from './SectionItem';

describe('mutations: ApprovedItem', () => {
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

  describe('createApprovedItem db mutation', () => {
    const username = 'ML';
    // a standard set of inputs for this mutation
    const input: CreateApprovedItemInput = {
      prospectId: '123-abc',
      title: 'Find Out How I Cured My Docker In 2 Days',
      url: 'https://test.com/docker',
      excerpt: 'A short summary of what this story is about',
      authors: [{ name: 'Mary Shelley', sortOrder: 1 }],
      status: CuratedStatus.CORPUS,
      imageUrl: 'https://test.com/image.png',
      language: CorpusLanguage.DE,
      publisher: 'Convective Cloud',
      topic: Topics.TECHNOLOGY,
      source: CorpusItemSource.PROSPECT,
      isCollection: false,
      isTimeSensitive: true,
      isSyndicated: false,
    };

    it('should create an approved item if the domain does not exist', async () => {
      const result = await createApprovedItem(db, input, username);

      // Expect to see all the input data we supplied in the Approved Item
      expect(result).toMatchObject(input);
      expect(result.domainName).toStrictEqual('test.com');
    });
  });

  describe('deleteApprovedItem db mutation', () => {
    it('should call to delete all associated section items', async () => {
      const deleteSectionItemSpy = jest.spyOn(
        SectionItem,
        'deleteSectionItemsByApprovedItemId',
      );

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'testing!',
      });

      await deleteApprovedItem(db, approvedItem.externalId);

      expect(deleteSectionItemSpy).toHaveBeenCalledTimes(1);

      jest.restoreAllMocks();
    });
  });
});
