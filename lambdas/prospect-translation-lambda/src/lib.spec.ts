import * as Sentry from '@sentry/serverless';
import { SQSEvent } from 'aws-lambda';

import { Prospect } from 'prospectapi-common';
import {
  ProspectType,
  ProspectRunDetails,
  Topics,
  UrlMetadata
} from 'content-common';

import {
  convertSqsProspectToProspect, getProspectRunDetailsFromMessageJson,
  getProspectsFromMessageJson,
  hasValidPredictedTopic,
  hasValidProspectId,
  hasValidProspectSource,
  hasValidSaveCount,
  hasValidScheduledSurfaceGuid,
  hasValidUrl,
  hydrateProspectMetadata,
  parseJsonFromEvent,
  validateProperties,
  validateStructure,
} from './lib';

describe('lib', () => {
  const captureExceptionSpy = jest
    .spyOn(Sentry, 'captureException')
    .mockImplementation();
  let validSqsProspect;
  let expected: Prospect;
  let prospectToHydrate;
  let urlMetadata: UrlMetadata;

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

    expected = {
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
      title: 'Test-Title',
      publisher: 'test-publisher',
      isCollection: false,
      isSyndicated: true,
      authors: 'questlove,rafael frumkin',
    };

    prospectToHydrate = {
      id: 'c3h5n3o9',
      prospectId: validSqsProspect.prospect_id,
      scheduledSurfaceGuid: validSqsProspect.scheduled_surface_guid,
      url: validSqsProspect.url,
      prospectType: validSqsProspect.prospect_source,
      topic: validSqsProspect.predicted_topic,
      saveCount: validSqsProspect.save_count,
      rank: validSqsProspect.rank,
    };

    urlMetadata = {
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

    captureExceptionSpy.mockClear();
  });

  describe('validateStructure', () => {
    it('should return true if object has all prospect properties', () => {
      expect(validateStructure(validSqsProspect)).toBeTruthy();
    });

    it('should return false if object is missing a prospect_id', () => {
      delete validSqsProspect.prospect_id;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a scheduled_surface_guid', () => {
      delete validSqsProspect.scheduled_surface_guid;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a predicted_topic', () => {
      delete validSqsProspect.predicted_topic;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a prospect_source', () => {
      delete validSqsProspect.prospect_source;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a url', () => {
      delete validSqsProspect.url;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a save_count', () => {
      delete validSqsProspect.save_count;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should return false if object is missing a rank', () => {
      delete validSqsProspect.rank;

      expect(validateStructure(validSqsProspect)).toBeFalsy();
    });

    it('should call Sentry if object is missing a required field', () => {
      delete validSqsProspect.prospect_id;

      validateStructure(validSqsProspect);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'prospect does not have a valid structure',
      );
    });
  });

  describe('hasValidProspectId', () => {
    it('should return true if the prospect_id is a string', () => {
      expect(hasValidProspectId(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the prospect_id is not a string', () => {
      validSqsProspect.prospect_id = 123;
      expect(hasValidProspectId(validSqsProspect)).toBeFalsy();
    });

    it('should return false if the prospect_id is empty', () => {
      validSqsProspect.prospect_id = undefined;
      expect(hasValidProspectId(validSqsProspect)).toBeFalsy();
    });
  });

  describe('hasValidScheduledSurfaceGuid', () => {
    it('should return true if the scheduled_surface_guid is one of our guids', () => {
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the scheduled_surface_guid is not one of our guids', () => {
      validSqsProspect.scheduled_surface_guid = 'NEW_TAB_CY_GB'; // Welsh
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).toBeFalsy();

      validSqsProspect.scheduled_surface_guid = 42;
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).toBeFalsy();

      validSqsProspect.scheduled_surface_guid = undefined;
      expect(hasValidScheduledSurfaceGuid(validSqsProspect)).toBeFalsy();
    });
  });

  describe('hasValidPredictedTopic', () => {
    it('should return true if the predicted_topic is one of our enums', () => {
      expect(hasValidPredictedTopic(validSqsProspect)).toBeTruthy();
    });

    it('should return true if predicted_topic is an empty string', () => {
      validSqsProspect.predicted_topic = '';
      expect(hasValidPredictedTopic(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the predicted_topic is not one of our enums', () => {
      validSqsProspect.predicted_topic =
        'companies without staging environments';
      expect(hasValidPredictedTopic(validSqsProspect)).toBeFalsy();

      validSqsProspect.predicted_topic = 900;
      expect(hasValidPredictedTopic(validSqsProspect)).toBeFalsy();

      validSqsProspect.predicted_topic = undefined;
      expect(hasValidPredictedTopic(validSqsProspect)).toBeFalsy();
    });

    it('should return false if predicted_topic is a single space string', () => {
      validSqsProspect.predicted_topic = ' ';
      expect(hasValidPredictedTopic(validSqsProspect)).toBeFalsy();
    });
  });

  describe('hasValidProspectSource', () => {
    it("should return true if the prospect_source is one of our enums assigned to the prospect's scheduled surface", () => {
      expect(hasValidProspectSource(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the prospect_source is not one of our enums', () => {
      validSqsProspect.prospect_source = 'GUT_FEELING';
      expect(hasValidProspectSource(validSqsProspect)).toBeFalsy();
    });

    it('should return true if the prospect_source is lower case', () => {
      validSqsProspect.prospect_type = 'organic_timespent';
      expect(hasValidProspectSource(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the prospect_source is not valid for the given scheduled surface', () => {
      // de-DE does not have a SYNDICATED_NEW prospectType
      validSqsProspect.scheduled_surface_guid = 'NEW_TAB_DE_DE';

      expect(hasValidProspectSource(validSqsProspect)).toBeFalsy();
    });
  });

  describe('hasValidUrl', () => {
    it('should return true if the url is valid', () => {
      expect(hasValidUrl(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the url is invalid', () => {
      validSqsProspect.url = 'getpocket.com';
      expect(hasValidUrl(validSqsProspect)).toBeFalsy();

      validSqsProspect.url = 'ftp://getpocket.com';
      expect(hasValidUrl(validSqsProspect)).toBeFalsy();

      validSqsProspect.url = 'file://getpocket.com';
      expect(hasValidUrl(validSqsProspect)).toBeFalsy();

      validSqsProspect.url = 900;
      expect(hasValidUrl(validSqsProspect)).toBeFalsy();

      validSqsProspect.url = undefined;
      expect(hasValidUrl(validSqsProspect)).toBeFalsy();
    });
  });

  describe('hasValidSaveCount', () => {
    it('should return true if the save_count is numeric', () => {
      expect(hasValidSaveCount(validSqsProspect)).toBeTruthy();
    });

    it('should return false if the save_count is not numeric', () => {
      validSqsProspect.save_count = '42';
      expect(hasValidSaveCount(validSqsProspect)).toBeFalsy();

      validSqsProspect.save_count = [];
      expect(hasValidSaveCount(validSqsProspect)).toBeFalsy();

      validSqsProspect.save_count = {};
      expect(hasValidSaveCount(validSqsProspect)).toBeFalsy();

      validSqsProspect.save_count = false;
      expect(hasValidSaveCount(validSqsProspect)).toBeFalsy();
    });
  });

  describe('validateProperties', () => {
    it('should return false and call Sentry if the prospect has errors', () => {
      delete validSqsProspect.scheduled_surface_guid;
      expect(validateProperties(validSqsProspect)).toBeFalsy();

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'sqsProspect has invalid properties',
      );
    });

    it('should return true if the prospect is valid', () => {
      expect(validateProperties(validSqsProspect)).toBeTruthy();
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

      expect(result.id).toBeDefined(); // we trust uuidV4 to work
      expect(result.prospectId).toEqual(expected.prospectId);
      expect(result.scheduledSurfaceGuid).toEqual(
        expected.scheduledSurfaceGuid,
      );
      expect(result.url).toEqual(expected.url);
      expect(result.prospectType).toEqual(expected.prospectType);
      expect(result.topic).toEqual(expected.topic);
      expect(result.saveCount).toEqual(expected.saveCount);
    });
  });

  describe('hydrateProspectMetaData', () => {
    it('should hydrate the prospect with the url meta data fields & apply title formatting if prospect is EN', () => {
      expected.title = 'Test-Title'; // AP style expected
      urlMetadata.title = 'test-title';

      expect(expected).toEqual(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });

    it('should hydrate the prospect with the url meta data fields & apply German formatting to title if prospect is DE', () => {
      expected.language = 'de';
      expected.title = 'Test-title — „Test”'; // German quotes / dash formatting expected

      urlMetadata.title = 'Test-title - »Test«';
      urlMetadata.language = 'de';

      expect(expected).toEqual(
          hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });

    it('should hydrate the prospect with the url meta data fields & NOT apply title formatting if prospect is not EN or DE', () => {
      expected.language = 'es';
      expected.title = 'test-title';

      urlMetadata.language = 'es';
      urlMetadata.title = 'test-title'; // AP style should NOT be applied

      expect(expected).toEqual(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });

    it('should hydrate the prospect with the url meta data fields & apply excerpt English curly quotes formatting if candidate is EN', () => {
      expected.excerpt = `Here’s a quote - ‘To be or not to be’`; // single curly apostrophes should be applied

      urlMetadata.excerpt = `Here's a quote - 'To be or not to be'`;

      expect(expected).toEqual(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });

    it('should hydrate the prospect with the url meta data fields & apply excerpt German quotes/dash formatting if candidate is DE', () => {
      // German quotes / dash formatting expected
      expected.excerpt = '„Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus „Tote Mädchen lügen nicht” und „Élite” – das musst du darüber wissen';
      expected.language = 'de';
      expected.title = 'test-title';

      urlMetadata.excerpt = '“Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus “Tote Mädchen lügen nicht” und “Élite” – das musst du darüber wissen';
      urlMetadata.language = 'de';
      urlMetadata.title = 'test-title';

      expect(expected).toEqual(
          hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });

    it('should hydrate prospect when parser has no metadata', () => {
      const expectedProspect: Prospect = {
        ...expected,
        excerpt: undefined,
        imageUrl: undefined,
        language: undefined,
        title: undefined,
        publisher: undefined,
        isCollection: undefined,
        isSyndicated: undefined,
        authors: undefined,
      };

      const urlMetadata: UrlMetadata = {
        url: 'test-url',
        domain: 'test-domain',
      };

      expect(expectedProspect).toEqual(
        hydrateProspectMetadata(prospectToHydrate, urlMetadata),
      );
    });
  });

  describe('getProspectRunDetailsFromMessageJson', () => {
    it('should get prospect run details from the  SQS formatted message', () => {
      const json = {
        foo: 'bar',
        detail: {
          id: '1abc',
          flow: 'GlobalProspectsFlow',
          run: 'sfn-05612',
          expires_at: 1716488367,
          candidates: [{ id: 1 }, { id: 2 }],
        },
      };

      const expectedRunDetails: ProspectRunDetails = {
        candidate_set_id: '1abc',
        flow: 'GlobalProspectsFlow',
        run_id: 'sfn-05612',
        expires_at: 1716488367,
      };

      expect(getProspectRunDetailsFromMessageJson(json)).toEqual(expectedRunDetails);
    });

    it('should return an empty obj and call Sentry if no detail obj found in JSON', () => {
      const json = {
        foo: 'bar',
      };

      expect(getProspectRunDetailsFromMessageJson(json)).toEqual({});

      expect(captureExceptionSpy).toHaveBeenCalledWith(
          'no `detail` property exists on the SQS JSON.',
      );
    });

    it('should return empty obj if details obj is present but no run details present', () => {
      const json = {
        foo: 'bar',
        detail: {
          bar: 'bar',
          candidates: [{ id: 1 }, { id: 2 }],
        },
      };

      expect(getProspectRunDetailsFromMessageJson(json)).toEqual({});
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

      expect(Array.isArray(getProspectsFromMessageJson(json))).toBeTruthy();
    });

    it('should return an empty array and call Sentry if candidates is not an array', () => {
      // event bridge > SQS
      const json = {
        foo: 'bar',
        detail: {
          candidates: { id: 1 },
        },
      };

      expect(getProspectsFromMessageJson(json)).toEqual([]);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'no `candidates` property exists on the SQS JSON, or `candidates` is not an array.',
      );
    });

    it('should return undefined given an unexpected json structure', () => {
      const json = {
        foo: 'bar',
        hammer: 'time',
      };

      expect(getProspectsFromMessageJson(json)).toEqual([]);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'no `candidates` property exists on the SQS JSON, or `candidates` is not an array.',
      );
    });
  });

  describe('parseJsonFromEvent', () => {
    it('sends a Sentry error if the event payload is not valid json', async () => {
      const fakeEvent = {
        Records: [{ messageId: '1', body: 'i am definitely not JSON!' }],
      } as unknown as SQSEvent;

      parseJsonFromEvent(fakeEvent);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'invalid data provided / sqs event.Records[0].body is not valid JSON.',
      );
    });

    it('sends a Sentry error if more than one record was sent in SQS', async () => {
      const fakeEvent = {
        Records: [
          { messageId: '1', body: JSON.stringify({}) },
          { messageId: '2', body: JSON.stringify({}) },
        ],
      } as unknown as SQSEvent;

      parseJsonFromEvent(fakeEvent);

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        'multiple records found in SQS message',
      );
    });
  });
});
