import { ProspectType } from 'content-common';
import { dbClient } from './dynamodb-client';
import { getProspectById, insertProspect, truncateDb } from './dynamodb';
import { createProspect } from '../test/helpers';
describe('dynamodb.common', () => {
  beforeAll(async () => {
    dbClient.destroy();
  });
  afterEach(async () => {
    await truncateDb(dbClient);
  });
  afterAll(async () => {
    dbClient.destroy();
  });

  describe('insertProspect', () => {
    it('should insert a prospect', async () => {
      const prospect = createProspect('EN_US', ProspectType.TIMESPENT);

      await insertProspect(dbClient, prospect);

      const res = await getProspectById(dbClient, prospect.id);

      expect(res).not.toBeUndefined();
    });
  });
});
