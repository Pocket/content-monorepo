import {applyApTitleCase, capitalize, parseReasonsCsv, sanitizeText} from './index';

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
      const string = 'A string! That conforms. To the regex? YES_IT_DOES. 20!';

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

  describe('capitalize', () => {
    it('should return empty str if string is null', () => {
      const output = capitalize(null as string);
      expect(output).toEqual('');
    });
    it('should capitalize the first char of a string', () => {
      const string = 'a random string';
      const output = capitalize(string);
      expect(output).toEqual('A random string');
    });
  });

  describe('applyApTitleCase', () => {
    it('should return undefined if string is null/undefined/empty string', () => {
      // null
      let output = applyApTitleCase(null as string);
      expect(output).toBeUndefined();

      // undefined
      output = applyApTitleCase(undefined as string);
      expect(output).toBeUndefined();

      // empty string
      output = applyApTitleCase('');
      expect(output).toBeUndefined();
    });
    it('should format string correctly using AP style', () => {
      const stringToFormat = 'a random String to format! random-string:Random!';
      const output = applyApTitleCase(stringToFormat);
      expect(output).toEqual('A Random String to Format! Random-String:Random!');
    });
  });
});
