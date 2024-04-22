import { PrismaClient, Prisma } from '.prisma/client';

import { client } from '../client';

import { clearDb } from '../../test/helpers';
import {
  createTrustedDomain,
  createTrustedDomainIfPastScheduledDateExists,
} from './TrustedDomain';

describe('TrustedDomain', () => {
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

  describe('createTrustedDomain', () => {
    it('should create an trusted domain if one does not exist', async () => {
      const result = await createTrustedDomain(db, 'test.com');

      expect(result.domainName).toStrictEqual('test.com');
    });

    it('should return a trusted domain without error if one already exists', async () => {
      await db.trustedDomain.create({
        data: {
          domainName: 'test.com',
        },
      });

      const result = await createTrustedDomain(db, 'test.com');

      expect(result.domainName).toStrictEqual('test.com');
    });

    it('should create a trusted domain without errors when called concurrently', async () => {
      const domainNames = Array.from({ length: 10 }).map((_) => 'test.com');

      // Concurrently create approved items
      const results = await Promise.all(
        domainNames.map((domainName) => createTrustedDomain(db, domainName)),
      );

      // Assertions to ensure each item returns the TrustedDomain
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.domainName).toStrictEqual('test.com');
      });

      // Verify that only a single row was inserted into TrustedDomain.
      const domainCount = await db.trustedDomain.count({
        where: { domainName: 'test.com' },
      });
      expect(domainCount).toStrictEqual(1);
    });
  });

  describe('createTrustedDomainIfPastScheduledDateExists', () => {
    it('Timezone should be UTC for the tests below', () => {
      expect(new Date().getTimezoneOffset()).toStrictEqual(0);
    });

    const baseScheduledItem: Prisma.ScheduledItemCreateInput = {
      approvedItem: {
        create: {
          externalId: 'unique_external_id',
          url: 'http://example.com',
          title: 'Example Title',
          excerpt: 'Sample excerpt',
          language: 'en',
          publisher: 'Example Publisher',
          imageUrl: 'http://example.com/image.jpg',
          domainName: 'example.com',
          createdAt: new Date(),
          createdBy: 'ML',
        },
      },
      scheduledDate: '2024-04-14',
      createdBy: 'ML',
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      source: 'ML',
    };

    it('should create a TrustedDomain for example.com if example.com was scheduled for yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.scheduledItem.create({
        data: {
          ...baseScheduledItem,
          scheduledDate: yesterday,
        },
      });

      const result = await createTrustedDomainIfPastScheduledDateExists(
        db,
        'example.com',
      );
      // Check that example.com is returned as a TrustedDomain.
      expect(result).not.toBeNull();
      expect(result.domainName).toEqual('example.com');

      // Check that example.com exists in the database as a TrustedDomain.
      const trustedDomain = await db.trustedDomain.findUnique({
        where: { domainName: 'example.com' },
      });
      expect(trustedDomain).toBeTruthy();
    });

    it('should not create a TrustedDomain if the domain was scheduled for today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.scheduledItem.create({
        data: {
          ...baseScheduledItem,
          scheduledDate: today,
        },
      });

      const result = await createTrustedDomainIfPastScheduledDateExists(
        db,
        'example.com',
      );
      // Check that the return value is null.
      expect(result).toBeNull();

      // Check that example.com does not exist as a TrustedDomain in the database.
      const trustedDomain = await db.trustedDomain.findUnique({
        where: { domainName: 'example.com' },
      });
      expect(trustedDomain).toBeNull();
    });

    it('should not create a TrustedDomain for foobar.blogs.com if blogs.com was scheduled before', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      pastDate.setHours(0, 0, 0, 0);

      await db.scheduledItem.create({
        data: {
          ...baseScheduledItem,
          approvedItem: {
            create: {
              ...baseScheduledItem.approvedItem.create,
              domainName: 'blogs.com',
              url: 'http://blogs.com',
            },
          },
          scheduledDate: pastDate,
        },
      });

      const result = await createTrustedDomainIfPastScheduledDateExists(
        db,
        'foobar.blogs.com',
      );
      expect(result).toBeNull();
    });
  });
});
