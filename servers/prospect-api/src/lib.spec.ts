import { faker } from '@faker-js/faker';
import { expect } from 'chai';

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

// turn the enum into an array so we can grab a random one easy peasy
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
      topic: faker.random.arrayElement(topicsArray),
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
      expect(getScheduledSurfaceByGuid('NEW_TAB_EN_US')).not.to.be.undefined;
    });

    it('should return false for an invalid scheduled surface GUID', () => {
      expect(getScheduledSurfaceByGuid('NEW_TAB_CY_GB')).to.be.undefined; // Welsh
    });
  });

  describe('isValidProspectType', () => {
    it('should return true for a valid prospect type', () => {
      expect(isValidProspectType('NEW_TAB_EN_US', ProspectType.SYNDICATED_NEW))
        .to.be.true;

      expect(isValidProspectType('NEW_TAB_DE_DE', ProspectType.COUNTS)).to.be
        .true;
    });

    it('should return false for an invalid prospect type', () => {
      expect(isValidProspectType('NEW_TAB_DE_DE', ProspectType.SYNDICATED_NEW))
        .to.be.false;
    });
  });

  describe('standardizeLanguage', () => {
    it('should standardize valid corpus languages', () => {
      expect(standardizeLanguage('en')).to.equal('EN');
      expect(standardizeLanguage('EN')).to.equal('EN');

      expect(standardizeLanguage('de')).to.equal('DE');
      expect(standardizeLanguage('DE')).to.equal('DE');

      expect(standardizeLanguage('es')).to.equal('ES');
      expect(standardizeLanguage('ES')).to.equal('ES');

      expect(standardizeLanguage('fr')).to.equal('FR');
      expect(standardizeLanguage('FR')).to.equal('FR');

      expect(standardizeLanguage('it')).to.equal('IT');
      expect(standardizeLanguage('IT')).to.equal('IT');
    });

    it('should return undefined if a non-corpus language is passed', () => {
      expect(standardizeLanguage('hi')).to.be.undefined;
      expect(standardizeLanguage('ga')).to.be.undefined;
      expect(standardizeLanguage('xx')).to.be.undefined;
    });

    it('should return undefined if null is passed', () => {
      expect(standardizeLanguage()).to.be.undefined;
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
        url: faker.internet.url(),
        createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
        saveCount: faker.datatype.number(),
        rank: 20,
      });

      const result = getSortedRankedProspects(prospects);

      console.log(result);

      // we have two prospect types
      expect(Object.keys(result).length).to.equal(2);

      expect(result.COUNTS.length).to.equal(3);
      expect(result.COUNTS[0].rank).to.equal(20);
      expect(result.COUNTS[1].rank).to.equal(20);
      expect(result.COUNTS[2].rank).to.equal(10);

      expect(result.SYNDICATED_NEW.length).to.equal(2);
      expect(result.SYNDICATED_NEW[0].rank).to.equal(20);
      expect(result.SYNDICATED_NEW[1].rank).to.equal(10);
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
        topic: faker.random.arrayElement(topicsArray),
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
      expect(result.length).to.equal(6);

      // the two COUNTS prospects should be in ascending order based on their rank
      expect(countsProspects[0].rank).to.be.below(countsProspects[1].rank);

      // the two SYNDICATED_NEW prospects should be in ascending order based on their rank
      expect(syndicatedProspects[0].rank).to.be.below(
        syndicatedProspects[1].rank
      );

      // the two TIMESPENT prospects should be in ascending order based on their rank
      expect(organicTimespentProspects[0].rank).to.be.below(
        organicTimespentProspects[1].rank
      );
    });

    it('should return an empty array when no prospects are provided', () => {
      const prospects: Prospect[] = [];

      const sortedRankedProspects = getSortedRankedProspects(prospects);
      const result = getRandomizedSortedRankedProspects(sortedRankedProspects);

      expect(result.length).to.equal(0);
    });

    it('should return a list of prospects of default batch size if more are provided', () => {
      const prospects: Prospect[] = [];

      const baseProspect = {
        id: faker.datatype.uuid(),
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.random.arrayElement(topicsArray),
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
      expect(result.length).to.equal(config.app.prospectBatchSize);
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
      expect(deDupedProspects.length).to.equal(prospects.length);
    });

    it('should return the de-duplicated prospect list', () => {
      const prospects: Prospect[] = makeProspects(3);

      const testProspect = {
        id: 'dupe',
        prospectId: faker.datatype.uuid(),
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        prospectType: ProspectType.COUNTS,
        topic: faker.random.arrayElement(topicsArray),
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
      expect(deDupedProspects.length).to.equal(4);
    });
  });
});
