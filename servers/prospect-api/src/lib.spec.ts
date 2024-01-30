import { faker } from '@faker-js/faker';

import config from './config';
import {
  getScheduledSurfaceByGuid,
  getSortedRankedProspects,
  getRandomizedSortedRankedProspects,
  isValidProspectType,
  standardizeLanguage,
  deDuplicateProspectUrls,
} from './lib';
import { Prospect, ProspectType, Topics } from 'prospectapi-common';

// turn the enum into an array, we can grab a random one easy-peasy
const topicsArray = Object.keys(Topics).map((key) => Topics[key]);

// TODO: refactor into a seeder-type helper for all tests?
const makeProspects = (
  count: number,
  options?: Partial<Prospect>
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
  describe('isValidScheduledSurfaceGuid', () => {
    it('should return true for a valid scheduled surface GUID', () => {
      expect(getScheduledSurfaceByGuid('NEW_TAB_EN_US')).not.toBeUndefined();
    });

    it('should return false for an invalid scheduled surface GUID', () => {
      expect(getScheduledSurfaceByGuid('NEW_TAB_CY_GB')).toBeUndefined(); // Welsh
    });
  });

  describe('isValidProspectType', () => {
    it('should return true for a valid prospect type', () => {
      expect(isValidProspectType('NEW_TAB_EN_US', ProspectType.SYNDICATED_NEW))
        .toBeTruthy();

      expect(isValidProspectType('NEW_TAB_DE_DE', ProspectType.COUNTS)).toBeTruthy();
    });

    it('should return false for an invalid prospect type', () => {
      expect(isValidProspectType('NEW_TAB_DE_DE', ProspectType.SYNDICATED_NEW))
        .toBeFalsy();
    });
  });

  describe('standardizeLanguage', () => {
    it('should standardize valid corpus languages', () => {
      expect(standardizeLanguage('en')).toEqual('EN');
      expect(standardizeLanguage('EN')).toEqual('EN');

      expect(standardizeLanguage('de')).toEqual('DE');
      expect(standardizeLanguage('DE')).toEqual('DE');

      expect(standardizeLanguage('es')).toEqual('ES');
      expect(standardizeLanguage('ES')).toEqual('ES');

      expect(standardizeLanguage('fr')).toEqual('FR');
      expect(standardizeLanguage('FR')).toEqual('FR');

      expect(standardizeLanguage('it')).toEqual('IT');
      expect(standardizeLanguage('IT')).toEqual('IT');
    });

    it('should return undefined if a non-corpus language is passed', () => {
      expect(standardizeLanguage('hi')).toBeUndefined();
      expect(standardizeLanguage('ga')).toBeUndefined();
      expect(standardizeLanguage('xx')).toBeUndefined();
    });

    it('should return undefined if null is passed', () => {
      expect(standardizeLanguage()).toBeUndefined();
    });
  });

  describe('getSortedRankedProspects', () => {
    it('should sort by descending rank', () => {
      const prospects: Prospect[] = [];

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 10,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 20,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 20,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.SYNDICATED_NEW,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 10,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.SYNDICATED_NEW,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 20,
      });

      const result = getSortedRankedProspects(prospects);

      console.log(result);

      // we have two prospect types
      expect(Object.keys(result).length).toEqual(2);

      expect(result.COUNTS.length).toEqual(3);
      expect(result.COUNTS[0].rank).toEqual(20);
      expect(result.COUNTS[1].rank).toEqual(20);
      expect(result.COUNTS[2].rank).toEqual(10);

      expect(result.SYNDICATED_NEW.length).toEqual(2);
      expect(result.SYNDICATED_NEW[0].rank).toEqual(20);
      expect(result.SYNDICATED_NEW[1].rank).toEqual(10);
    });
  });

  describe('getRandomizedSortedRankedProspects', () => {
    it('should return a randomized list of prospects where each prospect has the next top rank for its prospect type', () => {
      const prospects: Prospect[] = [];

      // push two prospects each of 3 different prospect types and different ranks
      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 10,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 20,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.TIMESPENT,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 30,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.TIMESPENT,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 60,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.SYNDICATED_NEW,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 40,
      });

      prospects.push({
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.SYNDICATED_NEW,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 50,
      });

      const sortedRankedProspects = getSortedRankedProspects(prospects);
      const result = getRandomizedSortedRankedProspects(sortedRankedProspects);

      // pull out the COUNTS prospect type prospects since the order of the results is randomized
      const countsProspects = result.filter((item) => {
        return item.prospectType === ProspectType.COUNTS;
      });
      // pull out the SYNDICATED_NEW prospect type prospects
      const syndicatedProspects = result.filter((item) => {
        return item.prospectType === ProspectType.SYNDICATED_NEW;
      });

      // pull out the TIMESPENT prospect type prospects
      const organicTimespentProspects = result.filter((item) => {
        return item.prospectType === ProspectType.TIMESPENT;
      });

      // number of results should be the same as the original list of prospects
      expect(result.length).toEqual(6);

      // the two COUNTS prospects should be in ascending order based on their rank
      expect(countsProspects[0].rank).toBeLessThan(countsProspects[1].rank);

      // the two SYNDICATED_NEW prospects should be in ascending order based on their rank
      expect(syndicatedProspects[0].rank).toBeLessThan(
        syndicatedProspects[1].rank
      );

      // the two TIMESPENT prospects should be in ascending order based on their rank
      expect(organicTimespentProspects[0].rank).toBeLessThan(
        organicTimespentProspects[1].rank
      );
    });

    it('should return an empty array when no prospects are provided', () => {
      const prospects: Prospect[] = [];

      const sortedRankedProspects = getSortedRankedProspects(prospects);
      const result = getRandomizedSortedRankedProspects(sortedRankedProspects);

      expect(result.length).toEqual(0);
    });

    it('should return a list of prospects of default batch size if more are provided', () => {
      const prospects: Prospect[] = [];

      const baseProspect = {
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 10,
      };

      // push 55 prospects which is more than our default batch size of 50
      for (let i = 0; i < 55; i++) {
        prospects.push({
          ...baseProspect,
          prospectType:
            i % 2 === 0 ? ProspectType.COUNTS : ProspectType.SYNDICATED_NEW,
          rank: Math.floor(Math.random() * 100),
        });
      }

      const sortedRankedProspects = getSortedRankedProspects(prospects);
      const result = getRandomizedSortedRankedProspects(sortedRankedProspects);

      // we should get a list equal to default batch size
      expect(result.length).toEqual(config.app.prospectBatchSize);
    });
  });

  //TODO: fix this test @Herraj
  describe.skip('findAndLogTrueDuplicateProspects', () => {
    it('should not call sentry if no true duplicates are found', () => {
      // chai.use(spies);
      // const prospects: Prospect[] = makeProspects(3);
      //const sentrySpy = chai.spy.on(Sentry, 'captureMessage');
      // findAndLogTrueDuplicateProspects(prospects);
      //expect(sentrySpy).to.not.have.been.called();
    });
  });

  describe('deDuplicateProspectUrls', () => {
    it('should return the same length array as the original when no duplicates are found', () => {
      const prospects: Prospect[] = makeProspects(3);

      const deDupedProspects = deDuplicateProspectUrls(prospects);

      // since no duplicates exist, resultant de-duped array should be same length as original
      expect(deDupedProspects.length).toEqual(prospects.length);
    });

    it('should return the de-duplicated prospect list', () => {
      const prospects: Prospect[] = makeProspects(3);

      const testProspect = {
        id: 'dupe',
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.helpers.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 10,
      };

      // adding three of the same prospects with the same url, total array length is 6
      prospects.push(testProspect);
      prospects.push(testProspect);
      prospects.push(testProspect);

      const deDupedProspects = deDuplicateProspectUrls(prospects);

      // length of returned array should be 4 after removing 2 duplicates
      expect(deDupedProspects.length).toEqual(4);
    });
  });
});
