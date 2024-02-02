import { faker } from '@faker-js/faker';

import { prospectToSnowplowProspect } from './lib';
import { Prospect, ProspectType, Topics } from 'prospectapi-common';

// turn the enum into an array, we can grab a random one easy-peasy
const topicsArray = Object.keys(Topics).map((key) => Topics[key]);

// TODO: refactor into a seeder-type helper for all tests?
const makeProspects = (
  count: number,
  options?: Partial<Prospect>,
): Prospect[] => {
  const prospects: Prospect[] = [];

  for (let i = 0; i < count; i++) {
    prospects.push({
      id: faker.datatype.uuid(),
      prospectId: faker.datatype.uuid(),
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      prospectType: ProspectType.COUNTS,
      topic: faker.helpers.arrayElement(topicsArray),
      url: faker.internet.url(),
      createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
      saveCount: faker.datatype.number(),
      rank: faker.datatype.number(),
      ...options,
    });
  }

  return prospects;
};

describe('lib', () => {
  describe('prospectToSnowplowProspect', () => {
    it('should add prospect details and authUserName to the snowplow entity', () => {
      const ps: Prospect[] = makeProspects(1);

      const snowplowProspect = prospectToSnowplowProspect(ps[0], 'LDAP|User');

      expect(snowplowProspect.prospect_id).toEqual(ps[0].prospectId);
      expect(snowplowProspect.scheduled_surface_id).toEqual(
        ps[0].scheduledSurfaceGuid,
      );
      expect(snowplowProspect.prospect_source).toEqual(ps[0].prospectType);
      expect(snowplowProspect.topic).toEqual(ps[0].topic);
      expect(snowplowProspect.url).toEqual(ps[0].url);
      expect(snowplowProspect.created_at).toEqual(ps[0].createdAt);
      expect(snowplowProspect.reviewed_by).toEqual('LDAP|User');
    });

    it('should add status reasons to the snowplow entity if present', () => {
      const ps: Prospect[] = makeProspects(1);

      const snowplowProspect = prospectToSnowplowProspect(
        ps[0],
        'LDAP|User',
        ['PUBLISHER', 'TOPIC'],
        'allow me to explain...',
      );

      expect(snowplowProspect.prospect_id).toEqual(ps[0].prospectId);
      expect(snowplowProspect.scheduled_surface_id).toEqual(
        ps[0].scheduledSurfaceGuid,
      );
      expect(snowplowProspect.prospect_source).toEqual(ps[0].prospectType);
      expect(snowplowProspect.topic).toEqual(ps[0].topic);
      expect(snowplowProspect.url).toEqual(ps[0].url);
      expect(snowplowProspect.created_at).toEqual(ps[0].createdAt);
      expect(snowplowProspect.status_reasons).toEqual(['PUBLISHER', 'TOPIC']);
      expect(snowplowProspect.status_reason_comment).toEqual(
        'allow me to explain...',
      );
      expect(snowplowProspect.reviewed_by).toEqual('LDAP|User');
    });

    it('should skip adding status reasons to the snowplow entity if null', () => {
      const ps: Prospect[] = makeProspects(1);

      const snowplowProspect = prospectToSnowplowProspect(
        ps[0],
        'LDAP|User',
        null,
        null,
      );

      expect(snowplowProspect.prospect_id).toEqual(ps[0].prospectId);
      expect(snowplowProspect.scheduled_surface_id).toEqual(
        ps[0].scheduledSurfaceGuid,
      );
      expect(snowplowProspect.prospect_source).toEqual(ps[0].prospectType);
      expect(snowplowProspect.topic).toEqual(ps[0].topic);
      expect(snowplowProspect.url).toEqual(ps[0].url);
      expect(snowplowProspect.created_at).toEqual(ps[0].createdAt);
      expect(snowplowProspect.status_reasons).toBeUndefined;
      expect(snowplowProspect.status_reason_comment).toBeUndefined;
      expect(snowplowProspect.reviewed_by).toEqual('LDAP|User');
    });
  });
});
