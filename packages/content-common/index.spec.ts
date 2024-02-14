import { parseReasonsCsv, sanitizeText } from './index';

// refactor/move if/when needed
// currently used in all tests below.
const maxStringLength = 100;

describe('content-common', () => {
  describe('parseReasonsCsv', () => {
    it('should create an array from multiple elements in a csv', () => {
      expect(parseReasonsCsv('PUBLISHER,TOPIC', maxStringLength)).toEqual([
        'PUBLISHER',
        'TOPIC',
      ]);
    });

    it('should create an array from a single element', () => {
      expect(parseReasonsCsv('PUBLISHER', maxStringLength)).toEqual([
        'PUBLISHER',
      ]);
    });

    it('should ignore trailing comma', () => {
      expect(parseReasonsCsv('PUBLISHER,', maxStringLength)).toEqual([
        'PUBLISHER',
      ]);
    });

    it('should return an empty array if null value', () => {
      expect(parseReasonsCsv(null, maxStringLength)).toEqual([]);
    });

    it('should return an empty array if empty string', () => {
      expect(parseReasonsCsv('', maxStringLength)).toEqual([]);
    });
  });

  describe('sanitizeText', () => {
    it('should not modify a string when it satisfies our conditions already', () => {
      const string = 'A string! That conforms. To the regex? YES. 20!';

      expect(sanitizeText(string, maxStringLength)).toEqual(string);
    });
    it('should remove illegal characters', () => {
      const string = '<lots>; of & illegal % chars # $ @ * ^ ( ) {} []!';

      expect(sanitizeText(string, maxStringLength)).toEqual(
        'lots of illegal chars !',
      );
    });

    it('should return an empty string if all the characters are illegal', () => {
      const string = '* (^* &^*#&^ $) #(*>{{}';

      expect(sanitizeText(string, maxStringLength)).toEqual('');
    });

    it('should trim surrounding whitespace', () => {
      const string = '  i luv 2 buffer my strings with spaces    &*#   ';

      expect(sanitizeText(string, maxStringLength)).toEqual(
        'i luv 2 buffer my strings with spaces',
      );
    });

    it('should trim the string to our set max length', () => {
      const string =
        'this is a very long string that will be more than one hundred characters. it is a real epic of a comment, which was the style at the time.';

      expect(sanitizeText(string, maxStringLength)).toEqual(
        'this is a very long string that will be more than one hundred characters. it is a real epic of a co',
      );
    });
  });
});
