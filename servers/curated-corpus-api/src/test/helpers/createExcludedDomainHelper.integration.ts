import { PrismaClient } from '.prisma/client';
import { clearDb } from './clearDb';
import {
  createExcludedDomainHelper,
  CreateExcludedDomainHelperInput,
} from './createExcludedDomainHelper';

const db = new PrismaClient();

describe('createExcludedDomainHelper', () => {
  beforeEach(async () => {
    await clearDb(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('creates an excluded domain with domain name supplied', async () => {
    const data: CreateExcludedDomainHelperInput = {
      domainName: 'test.com',
    };

    const item = await createExcludedDomainHelper(db, data);

    // Expect to see the title we passed to the helper
    expect(item.domainName).toEqual(data.domainName);
  });
});
