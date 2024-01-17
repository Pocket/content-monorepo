import { Prospect, Topics, ProspectType } from './types';
import { toUnixTimestamp } from './lib';
import { generateInsertParams } from './dynamodb';

describe('dynamodb.common', () => {
  let prospect: Prospect;

  beforeEach(() => {
    prospect = {
      id: 'LeGuId',
      prospectId: 'LeProspectGuid',
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      rank: 10,
      topic: Topics.GAMING,
      prospectType: ProspectType.TIMESPENT,
      url: 'https://getpocket.com',
      saveCount: 2100,
    };
  });

  describe('generateInsertParams', () => {
    it('should correctly map prospect into a dynamodb item', () => {
      const params = generateInsertParams(prospect);

      expect(params.Item?.id).toEqual(prospect.id);
      expect(params.Item?.scheduledSurfaceGuid).toEqual(
        prospect.scheduledSurfaceGuid,
      );
      expect(params.Item?.rank).toEqual(prospect.rank);
      expect(params.Item?.url).toEqual(prospect.url);
      expect(params.Item?.topic).toEqual(prospect.topic);
      expect(params.Item?.prospectType).toEqual(prospect.prospectType);
      expect(params.Item?.createdAt).not.toBeNull();
    });

    it('should generate a `createdAt` date of the current time', () => {
      // we're just making sure the `createdAt` value is greater than one minute ago
      const params = generateInsertParams(prospect);

      const now = toUnixTimestamp();
      const oneMinuteAgo = toUnixTimestamp(new Date(now - 6000));

      expect(params.Item?.createdAt).toBeGreaterThan(oneMinuteAgo);
    });
  });
});
