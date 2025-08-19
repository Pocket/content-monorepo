import { UserInputError } from '@pocket-tools/apollo-utils';
import { validateIAB } from '.';
import { IABMetadata } from 'content-common';

describe('Section', () => {
  describe('validateIAB', () => {
    const TEST_TAXONOMY = 'IAB-3.0';

    it('should accept a supported taxonomy with valid codes', () => {
      const iab: IABMetadata = {
        taxonomy: TEST_TAXONOMY,
        categories: ['TIFQA5', '225'],
      };

      expect(() => validateIAB(iab)).not.toThrow();
    });

    it('should throw a UserInputError for an unsupported taxonomy', () => {
      const iab: IABMetadata = {
        taxonomy: 'UNSUPPORTED_TAXONOMY',
        categories: ['TIFQA5', '225'],
      };

      expect(() => validateIAB(iab)).toThrow(UserInputError);
      expect(() => validateIAB(iab)).toThrow(
        'IAB taxonomy version UNSUPPORTED_TAXONOMY is not supported',
      );
    });

    it('should throw a UserInputError for invalid codes, even when some are valid', () => {
      const iab: IABMetadata = {
        taxonomy: TEST_TAXONOMY,
        categories: ['TIFQA5', '225', 'invalid1', 'invalid2'],
      };
      // only 2 codes are invalid & should be included with the error message
      expect(() => validateIAB(iab)).toThrow(UserInputError);
      expect(() => validateIAB(iab)).toThrow(
        "IAB code(s) invalid: invalid1,invalid2",
      );
    });
  });
});
