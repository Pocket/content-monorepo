import { PrismaClient } from '.prisma/client';
import { client } from '../client';
import { clearDb, createExcludedDomainHelper } from '../../test/helpers';
import { isExcludedDomain } from './ExcludedDomain';

describe('ExcludedDomain', () => {
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
    await createExcludedDomainHelper(db, { domainName: 'excludeme.com' });
    await createExcludedDomainHelper(db, { domainName: 'getmeoutofhere.com' });
    await createExcludedDomainHelper(db, {
      domainName: 'leavemeoutofthis.com',
    });
  });

  describe('isExcludedDomain', () => {
    it('should return false if domain is not present on the excluded list', async () => {
      const result = await isExcludedDomain(db, 'test.com');
      expect(result).toStrictEqual(false);
    });

    it('should return true if domain is on the excluded list', async () => {
      const result = await isExcludedDomain(db, 'leavemeoutofthis.com');
      expect(result).toStrictEqual(true);
    });
  });
});
