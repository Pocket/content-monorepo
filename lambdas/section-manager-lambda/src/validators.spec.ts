import { createSqsSectionWithSectionItems } from './testHelpers';
import { CorpusItemSource, ScheduledSurfacesEnum } from 'content-common';
import { validateSqsData } from './validators';

describe('validation', function () {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('validateSqsData', () => {
    let sqsData: any;

    beforeEach(() => {
      // cast as any because we need to force it to an invalid state in tests below
      sqsData = createSqsSectionWithSectionItems({}, 2) as any;
    });

    describe('validate Section data', () => {
      it('should validate candidates property', () => {
        delete sqsData.candidates;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates, expect to be Array<SqsSectionItem>',
        );

        // candidates is an invalid value
        sqsData.candidates = 42;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates, expect to be Array<SqsSectionItem>',
        );

        // candidates should accept an empty array
        sqsData.candidates = [];

        expect(() => {
          validateSqsData(sqsData);
        }).not.toThrow();
      });

      it('should validate source property', () => {
        expect(() => {
          validateSqsData(sqsData);
        }).not.toThrow();

        // source is missing
        delete sqsData.source;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.source, expect to be "ML"',
        );

        // source is an invalid value
        sqsData.source = CorpusItemSource.MANUAL;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.source, expect to be "ML"',
        );
      });

      it('should validate scheduled_surface_guid property', () => {
        // scheduled_surface_guid is missing
        delete sqsData.scheduled_surface_guid;

        // should throw error
        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.scheduled_surface_guid, expect to be ("NEW_TAB_DE_DE" | "NEW_TAB_EN_GB" | "NEW_TAB_EN_INT" | "NEW_TAB_EN_US" | "NEW_TAB_ES_ES" | "NEW_TAB_FR_FR" | "NEW_TAB_IT_IT" | "POCKET_HITS_DE_DE" | "POCKET_HITS_EN_US" | "SANDBOX")',
        );

        // scheduled surface has an invalid value
        sqsData.scheduled_surface_guid = 'bad-surface' as ScheduledSurfacesEnum;

        // should throw error
        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.scheduled_surface_guid, expect to be ("NEW_TAB_DE_DE" | "NEW_TAB_EN_GB" | "NEW_TAB_EN_INT" | "NEW_TAB_EN_US" | "NEW_TAB_ES_ES" | "NEW_TAB_FR_FR" | "NEW_TAB_IT_IT" | "POCKET_HITS_DE_DE" | "POCKET_HITS_EN_US" | "SANDBOX")',
        );
      });

      it('should validate iab property', () => {
        // iab is valid & should not throw error
        expect(() => {
          validateSqsData(sqsData);
        }).not.toThrow();

        // iab is optional and not present in payload, should not throw error
        delete sqsData.iab;
        expect(() => {
          validateSqsData(sqsData);
        }).not.toThrow();

        // iab present & no taxonomy, should throw error
        sqsData.iab = { invalid: 'iab-taxonomy', categories: ['ABC'] };

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.iab.taxonomy, expect to be string',
        );

        // iab present & no categories, should throw error
        sqsData.iab = { taxonomy: 'IAB-3.0', invalid: ['category'] };

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.iab.categories, expect to be Array<string>',
        );
      });
    });

    describe('validate SectionItem data', () => {
      it('should validate source property', () => {
        // missing source property
        delete sqsData.candidates[0].source;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].source, expect to be "ML"',
        );

        // invalid source property
        sqsData.candidates[0].source = CorpusItemSource.MANUAL;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].source, expect to be "ML"',
        );
      });

      it('should validate status property', () => {
        // missing status property
        delete sqsData.candidates[0].status;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].status, expect to be ("CORPUS" | "RECOMMENDATION")',
        );

        // invalid status property
        sqsData.candidates[0].status = 'LOST';

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].status, expect to be ("CORPUS" | "RECOMMENDATION")',
        );
      });

      it('should validate topic property', () => {
        // missing topic property
        delete sqsData.candidates[0].topic;

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].topic, expect to be ("BUSINESS" | "CAREER" | "CORONAVIRUS" | "EDUCATION" | "ENTERTAINMENT" | "FOOD" | "GAMING" | "HEALTH_FITNESS" | "HOME" | "PARENTING" | "PERSONAL_FINANCE" | "POLITICS" | "SCIENCE" | "SELF_IMPROVEMENT" | "SPORTS" | "TECHNOLOGY" | "TRAVEL")',
        );

        // invalid topic property
        sqsData.candidates[0].topic = 'TRABAJANDO';

        expect(() => {
          validateSqsData(sqsData);
        }).toThrow(
          'Error on assert(): invalid type on $input.candidates[0].topic, expect to be ("BUSINESS" | "CAREER" | "CORONAVIRUS" | "EDUCATION" | "ENTERTAINMENT" | "FOOD" | "GAMING" | "HEALTH_FITNESS" | "HOME" | "PARENTING" | "PERSONAL_FINANCE" | "POLITICS" | "SCIENCE" | "SELF_IMPROVEMENT" | "SPORTS" | "TECHNOLOGY" | "TRAVEL")',
        );
      });
    });

    // unfortunately, typia's error messages are not consistent, so we need two
    // tests to verify handling of optional properties
    it.each([
      ['excerpt', 'string'],
      ['image_url', 'string'],
      ['title', 'string'],
    ])('should validate optional string properties', (field, type) => {
      // null is a valid value from ML
      sqsData.candidates[0][field] = null;

      expect(() => {
        validateSqsData(sqsData);
      }).not.toThrow();

      // undefined is NOT a valid value from ML
      delete sqsData.candidates[0][field];

      expect(() => {
        validateSqsData(sqsData);
      }).toThrow(
        `Error on assert(): invalid type on $input.candidates[0].${field}, expect to be (null | ${type})`,
      );
    });

    it.each([
      ['authors', 'Array<string>'],
      ['language', '"DE" | "EN" | "ES" | "FR" | "IT"'],
    ])('should validate optional non-string properties', (field, type) => {
      // null is a valid value from ML
      sqsData.candidates[0][field] = null;

      expect(() => {
        validateSqsData(sqsData);
      }).not.toThrow();

      // undefined is NOT a valid value from ML
      delete sqsData.candidates[0][field];

      expect(() => {
        validateSqsData(sqsData);
      }).toThrow(
        `Error on assert(): invalid type on $input.candidates[0].${field}, expect to be (${type} | null)`,
      );
    });
  });
});
