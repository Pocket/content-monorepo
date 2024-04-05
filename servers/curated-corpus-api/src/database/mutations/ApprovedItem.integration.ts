import { PrismaClient } from '.prisma/client';

import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
} from 'content-common';

import { client } from '../client';

import { clearDb } from '../../test/helpers';
import { CreateApprovedItemInput } from '../types';
import { createApprovedItem } from './ApprovedItem';

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

      const domain = await db.domain.findUnique({
        where: { domainName: 'test.com' },
      });

      expect(domain).toMatchObject({
        domainName: 'test.com',
        isTrusted: false,
      });
    });

    it('should create an approved item if the domain already exists', async () => {
      await db.domain.create({
        data: {
          domainName: 'test.com',
        },
      });

      const result = await createApprovedItem(db, input, username);

      // Expect to see all the input data we supplied in the Approved Item
      expect(result).toMatchObject(input);
      expect(result.domainName).toStrictEqual('test.com');

      const domainCount = await db.domain.count();
      expect(domainCount).toStrictEqual(1);
    });

    it('should concurrently create 10 approved items with unique URLs', async () => {
      const inputs = Array.from({ length: 10 }).map((_, index) => ({
        ...input,
        url: `https://test.com/path${index}`,
      }));

      // Concurrently create approved items
      const results = await Promise.all(
        inputs.map((uniqueInput) =>
          createApprovedItem(db, uniqueInput, username),
        ),
      );

      // Assertions to ensure each item was created correctly
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.domainName).toStrictEqual('test.com');
      });

      // Verify that all the domains were created and are associated correctly
      const domainCount = await db.domain.count({
        where: { domainName: 'test.com' },
      });
      expect(domainCount).toStrictEqual(1);
    });

    it('should throw an error when the domain exceeds 255 characters', async () => {
      const longDomain = 'a'.repeat(256) + '.example.com';
      const longDomainInput = {
        ...input,
        url: `https://${longDomain}`,
      };
      await expect(
        createApprovedItem(db, longDomainInput, username),
      ).rejects.toThrow(Error);
    });
  });
});
