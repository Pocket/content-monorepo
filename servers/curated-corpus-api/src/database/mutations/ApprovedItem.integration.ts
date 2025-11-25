import { PrismaClient } from '.prisma/client';

import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  Topics,
} from 'content-common';

import { client } from '../client';

import {
  clearDb,
  createApprovedItemHelper,
  createPublisherDomainHelper,
} from '../../test/helpers';
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

    it('should use provided publisher when explicitly set', async () => {
      const result = await createApprovedItem(db, input, username);

      expect(result.publisher).toStrictEqual('Convective Cloud');
    });

    it('should derive publisher from PublisherDomain by exact subdomain match', async () => {
      // Create a publisher domain entry for the subdomain
      await createPublisherDomainHelper(db, {
        domainName: 'news.example.com',
        publisher: 'Example News',
      });

      const inputWithoutPublisher = {
        ...input,
        url: 'https://news.example.com/article',
        publisher: undefined,
      };

      const result = await createApprovedItem(db, inputWithoutPublisher, username);

      expect(result.publisher).toStrictEqual('Example News');
      expect(result.domainName).toStrictEqual('news.example.com');
    });

    it('should derive publisher from PublisherDomain by registrable domain when subdomain not found', async () => {
      // Create a publisher domain entry for the registrable domain only
      await createPublisherDomainHelper(db, {
        domainName: 'example.com',
        publisher: 'Example Inc',
      });

      const inputWithoutPublisher = {
        ...input,
        url: 'https://blog.example.com/post',
        publisher: undefined,
      };

      const result = await createApprovedItem(db, inputWithoutPublisher, username);

      expect(result.publisher).toStrictEqual('Example Inc');
      expect(result.domainName).toStrictEqual('blog.example.com');
    });

    it('should prefer subdomain match over registrable domain match', async () => {
      // Create entries for both subdomain and registrable domain
      await createPublisherDomainHelper(db, {
        domainName: 'sports.example.com',
        publisher: 'Example Sports',
      });
      await createPublisherDomainHelper(db, {
        domainName: 'example.com',
        publisher: 'Example Inc',
      });

      const inputWithoutPublisher = {
        ...input,
        url: 'https://sports.example.com/game',
        publisher: undefined,
      };

      const result = await createApprovedItem(db, inputWithoutPublisher, username);

      expect(result.publisher).toStrictEqual('Example Sports');
    });

    it('should fallback to hostname when no PublisherDomain match found', async () => {
      const inputWithoutPublisher = {
        ...input,
        url: 'https://unknown-domain.org/page',
        publisher: undefined,
      };

      const result = await createApprovedItem(db, inputWithoutPublisher, username);

      expect(result.publisher).toStrictEqual('unknown-domain.org');
      expect(result.domainName).toStrictEqual('unknown-domain.org');
    });

    it('should treat empty string publisher same as undefined', async () => {
      const inputWithEmptyPublisher = {
        ...input,
        url: 'https://another-unknown.com/page',
        publisher: '',
      };

      const result = await createApprovedItem(db, inputWithEmptyPublisher, username);

      // Should fallback to hostname since no PublisherDomain entry exists
      expect(result.publisher).toStrictEqual('another-unknown.com');
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
