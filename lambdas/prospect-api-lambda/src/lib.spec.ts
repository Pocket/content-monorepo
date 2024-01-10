import { expect } from 'chai';

import {
  Prospect,
  ProspectType,
  Topics,
  UrlMetadata,
} from 'prospectapi-common';

import {
  hasValidStructure,
  hasValidProspectId,
  hasValidScheduledSurfaceGuid,
  hasValidPredictedTopic,
  hasValidProspectSource,
  hasValidUrl,
  validateProperties,
  convertSqsProspectToProspect,
  hasValidSaveCount,
  hydrateProspectMetadata,
  getProspectsFromMessageJson,
} from './lib';

describe('lib', () => {
  let validSqsProspect;

  beforeEach(() => {
    validSqsProspect = {
      prospect_id: '123abc',
      scheduled_surface_guid: 'NEW_TAB_EN_US',
      predicted_topic: Topics.ENTERTAINMENT,
      prospect_source: ProspectType.SYNDICATED_NEW,
      url: 'https://getpocket.com',
      save_count: 1680,
      rank: 1680,
    };
  });

  describe('hasValidStructure', () => {
    it('should return true if object has all prospect properties', () => {
      expect(hasValidStructure(validSqsProspect)).to.be.true;
    });

    it('should return false if object is missing a prospect_id', () => {
      delete validSqsProspect.prospect_id;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a scheduled_surface_guid', () => {
      delete validSqsProspect.scheduled_surface_guid;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a predicted_topic', () => {
      delete validSqsProspect.predicted_topic;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a prospect_source', () => {
      delete validSqsProspect.prospect_source;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a url', () => {
      delete validSqsProspect.url;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a save_count', () => {
      delete validSqsProspect.save_count;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });

    it('should return false if object is missing a rank', () => {
      delete validSqsProspect.rank;

      expect(hasValidStructure(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidProspectId', () => {
    it('should return true if the prospect_id is a string', () => {
      expect(hasValidProspectId(validSqsProspect)).to.be.true;
    });

    it('should return false if the prospect_id is not a string', () => {
      validSqsProspect.prospect_id = 123;
      expect(hasValidProspectId(validSqsProspect)).to.be.false;
    });

    it('should return false if the prospect_id is empty', () => {
      validSqsProspect.prospect_id = undefined;
      expect(hasValidProspectId(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidScheduledSurfaceGuid', () => {
    it('should return true if the scheduled_surface_guid is one of our guids', () => {
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).to.be.true;
    });

    it('should return false if the scheduled_surface_guid is not one of our guids', () => {
      validSqsProspect.scheduled_surface_guid = 'NEW_TAB_CY_GB'; // Welsh
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).to.be.false;

      validSqsProspect.scheduled_surface_guid = 42;
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).to.be.false;

      validSqsProspect.scheduled_surface_guid = undefined;
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidPredictedTopic', () => {
    it('should return true if the predicted_topic is one of our enums', () => {
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.true;
    });

    it('should return true if predicted_topic is an empty string', () => {
      validSqsProspect.predicted_topic = '';
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.true;
    });

    it('should return false if the predicted_topic is not one of our enums', () => {
      validSqsProspect.predicted_topic =
        'companies without staging environments';
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.false;

      validSqsProspect.predicted_topic = 900;
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.false;

      validSqsProspect.predicted_topic = undefined;
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.false;
    });

    it('should return false if predicted_topic is a single space string', () => {
      validSqsProspect.predicted_topic = ' ';
      expect(hasValidPredictedTopic(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidProspectSource', () => {
    it("should return true if the prospect_source is one of our enums assigned to the prospect's scheduled surface", () => {
      expect(hasValidProspectSource(validSqsProspect)).to.be.true;
    });

    it('should return false if the prospect_source is not one of our enums', () => {
      validSqsProspect.prospect_source = 'GUT_FEELING';
      expect(hasValidProspectSource(validSqsProspect)).to.be.false;
    });

    it('should return true if the prospect_source is lower case', () => {
      validSqsProspect.prospect_type = 'organic_timespent';
      expect(hasValidProspectSource(validSqsProspect)).to.be.true;
    });

    it('should return false if the prospect_source is not valid for the given scheduled surface', () => {
      // de-DE does not have a SYNDICATED_NEW prospectType
      validSqsProspect.scheduled_surface_guid = 'NEW_TAB_DE_DE';

      expect(hasValidProspectSource(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidUrl', () => {
    it('should return true if the url is valid', () => {
      expect(hasValidUrl(validSqsProspect)).to.be.true;
    });

    it('should return false if the url is invalid', () => {
      validSqsProspect.url = 'getpocket.com';
      expect(hasValidUrl(validSqsProspect)).to.be.false;

      validSqsProspect.url = 'ftp://getpocket.com';
      expect(hasValidUrl(validSqsProspect)).to.be.false;

      validSqsProspect.url = 'file://getpocket.com';
      expect(hasValidUrl(validSqsProspect)).to.be.false;

      validSqsProspect.url = 900;
      expect(hasValidUrl(validSqsProspect)).to.be.false;

      validSqsProspect.url = undefined;
      expect(hasValidUrl(validSqsProspect)).to.be.false;
    });
  });

  describe('hasValidSaveCount', () => {
    it('should return true if the save_count is numeric', () => {
      expect(hasValidSaveCount(validSqsProspect)).to.be.true;
    });

    it('should return false if the save_count is not numeric', () => {
      validSqsProspect.save_count = '42';
      expect(hasValidSaveCount(validSqsProspect)).to.be.false;

      validSqsProspect.save_count = [];
      expect(hasValidSaveCount(validSqsProspect)).to.be.false;

      validSqsProspect.save_count = {};
      expect(hasValidSaveCount(validSqsProspect)).to.be.false;

      validSqsProspect.save_count = false;
      expect(hasValidSaveCount(validSqsProspect)).to.be.false;
    });
  });

  describe('validateProperties', () => {
    it('should return a non-zero array if the prospect has errors', () => {
      delete validSqsProspect.scheduled_surface_guid;
      expect(validateProperties(validSqsProspect).length).to.be.greaterThan(0);
    });

    it('should return an empty array if the prospect is valid', () => {
      expect(validateProperties(validSqsProspect).length).to.equal(0);
    });
  });

  describe('convertSqsProspectToProspect', () => {
    it('should create a Prospect from an SqsProspect', () => {
      const expected: Prospect = {
        id: 'c3h5n3o9',
        prospectId: validSqsProspect.prospect_id,
        scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
        url: validSqsProspect.url,
        prospectType: validSqsProspect.prospect_source,
        topic: validSqsProspect.predicted_topic,
        saveCount: validSqsProspect.save_count,
        rank: validSqsProspect.rank,
      };

      const result = convertSqsProspectToProspect(validSqsProspect);

      expect(result.id).to.exist; // we trust uuidV4 to work
      expect(result.prospectId).to.equal(expected.prospectId);
      expect(result.scheduledSurfaceGuid).to.equal(
        expected.scheduledSurfaceGuid
      );
      expect(result.url).to.equal(expected.url);
      expect(result.prospectType).to.equal(expected.prospectType);
      expect(result.topic).to.equal(expected.topic);
      expect(result.saveCount).to.equal(expected.saveCount);
    });
  });

  describe('hydrateProspectMetaData', () => {
    it('should hydrate the prospect with the url meta data fields ', () => {
      const expected: Prospect = {
        id: 'c3h5n3o9',
        prospectId: validSqsProspect.prospect_id,
        scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
        url: validSqsProspect.url,
        prospectType: validSqsProspect.prospect_source,
        topic: validSqsProspect.predicted_topic,
        saveCount: validSqsProspect.save_count,
        rank: validSqsProspect.rank,
        domain: 'test-domain',
        excerpt: 'test-excerpt',
        imageUrl: 'test-imageUrl',
        language: 'en',
        title: 'test-title',
        publisher: 'test-publisher',
        isCollection: false,
        isSyndicated: true,
        authors: 'questlove,rafael frumkin',
      };

      const prospectToHydrate = {
        id: 'c3h5n3o9',
        prospectId: validSqsProspect.prospect_id,
        scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
        url: validSqsProspect.url,
        prospectType: validSqsProspect.prospect_source,
        topic: validSqsProspect.predicted_topic,
        saveCount: validSqsProspect.save_count,
        rank: validSqsProspect.rank,
      };

      const urlMetadata: UrlMetadata = {
        url: 'test-url',
        domain: 'test-domain',
        excerpt: 'test-excerpt',
        imageUrl: 'test-imageUrl',
        language: 'en',
        title: 'test-title',
        publisher: 'test-publisher',
        isCollection: false,
        isSyndicated: true,
        authors: 'questlove,rafael frumkin',
      };

      expect(expected).to.deep.equal(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata)
      );
    });

    it('should hydrate prospect when parser has no metadata ', () => {
      const expected: Prospect = {
        id: 'c3h5n3o9',
        prospectId: validSqsProspect.prospect_id,
        scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
        url: validSqsProspect.url,
        prospectType: validSqsProspect.prospect_source,
        topic: validSqsProspect.predicted_topic,
        saveCount: validSqsProspect.save_count,
        rank: validSqsProspect.rank,
        domain: 'test-domain',
        excerpt: undefined,
        imageUrl: undefined,
        language: undefined,
        title: undefined,
        publisher: undefined,
        isCollection: undefined,
        isSyndicated: undefined,
        authors: undefined,
      };

      const prospectToHydrate = {
        id: 'c3h5n3o9',
        prospectId: validSqsProspect.prospect_id,
        scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
        url: validSqsProspect.url,
        prospectType: validSqsProspect.prospect_source,
        topic: validSqsProspect.predicted_topic,
        saveCount: validSqsProspect.save_count,
        rank: validSqsProspect.rank,
      };

      const urlMetadata: UrlMetadata = {
        url: 'test-url',
        domain: 'test-domain',
      };

      expect(expected).to.deep.equal(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata)
      );
    });
  });

  describe('getProspectsFromMessageJson', () => {
    it('should get prospects from an event bridge > SQS formatted message', () => {
      const json = {
        foo: 'bar',
        detail: {
          candidates: [{ id: 1 }, { id: 2 }],
        },
      };

      expect(Array.isArray(getProspectsFromMessageJson(json))).to.be.true;
    });

    it('should return undefined if candidates is not an array', () => {
      // event bridge > SQS
      const json = {
        foo: 'bar',
        detail: {
          candidates: { id: 1 },
        },
      };

      expect(getProspectsFromMessageJson(json)).to.be.undefined;
    });

    it('should return undefined given an unexpected json structure', () => {
      const json = {
        foo: 'bar',
        hammer: 'time',
      };

      expect(getProspectsFromMessageJson(json)).to.be.undefined;
    });
  });
});
