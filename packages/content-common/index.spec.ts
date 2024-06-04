import {
  applyApTitleCase,
  formatQuotesDashesDE,
  formatQuotesEN,
  capitalize,
  parseReasonsCsv,
  sanitizeText
} from './index';

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
  // taken from curation admin tools
  describe('formatQuotesEN', () => {
    it('should return undefined if text is null/undefined/empty string', () => {
      // null
      let output = formatQuotesEN(null as string);
      expect(output).toBeUndefined();

      // undefined
      output = formatQuotesEN(undefined as string);
      expect(output).toBeUndefined();

      // empty string
      output = formatQuotesEN('');
      expect(output).toBeUndefined();
    });

    it('adds single open curly apostrophe for straight apostrophe', () => {
      const result = formatQuotesEN("Here's to the great ones!");
      expect(result).toEqual('Here’s to the great ones!');
    });

    it('adds double curly apostrophes for straight apostrophe wrapping text', () => {
      const result = formatQuotesEN('Here\'s a quote - "To be or not to be"');
      expect(result).toEqual('Here’s a quote - “To be or not to be”');
    });

    it('adds single curly apostrophes for straight apostrophes wrapping text', () => {
      const result = formatQuotesEN("Here's a quote - 'To be or not to be'");
      expect(result).toEqual('Here’s a quote - ‘To be or not to be’');
    });

    it('adds single curly apostrophes at the end of quotes', () => {
      const result = formatQuotesEN("Here's a quote - 'To be or not to be.'");
      expect(result).toEqual('Here’s a quote - ‘To be or not to be.’');
    });

    it('adds double curly apostrophes at the end of quotes', () => {
      const result = formatQuotesEN(
          'I tried the workout, and it did more than expected. "Fitness is for Everyone."'
      );
      expect(result).toEqual(
          'I tried the workout, and it did more than expected. “Fitness is for Everyone.”'
      );
    });
  });

  describe('formatQuotesDashesDE', () => {
    it('should return undefined if text is null/undefined/empty string', () => {
      // null
      let output = formatQuotesDashesDE(null as string);
      expect(output).toBeUndefined();

      // undefined
      output = formatQuotesDashesDE(undefined as string);
      expect(output).toBeUndefined();

      // empty string
      output = formatQuotesDashesDE('');
      expect(output).toBeUndefined();
    });
    it('Successfully does all replacements', () => {
      const result = formatQuotesDashesDE('“Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus “Tote Mädchen lügen nicht” und “Élite” – das musst du darüber wissen');
      expect(result).toEqual('„Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus „Tote Mädchen lügen nicht” und „Élite” – das musst du darüber wissen');
    });
    it('Replaces opening » with „', () => {
      const result = formatQuotesDashesDE('»Here\'s to the great ones!');
      expect(result).toEqual('„Here\'s to the great ones!');
    });
    it('Replaces closing « with “', () => {
      const result = formatQuotesDashesDE('Here\'s to the great ones!«');
      expect(result).toEqual('Here\'s to the great ones!”');
    });
    it('Replaces » with „ and « with “', () => {
      const result = formatQuotesDashesDE('»Here\'s to the great ones!«');
      expect(result).toEqual('„Here\'s to the great ones!”');
    });
    it('Replaces opening " with „', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great ones!');
      expect(result).toEqual('„Here\'s to the great ones!');
    });
    it('Replaces closing " with “', () => {
      const result = formatQuotesDashesDE('Here\'s to the great ones!"');
      expect(result).toEqual('Here\'s to the great ones!”');
    });
    it('Replaces opening " with „ and closing " with “', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great ones!"');
      expect(result).toEqual('„Here\'s to the great ones!”');
    });
    it('Replaces opening “ with „', () => {
      const result = formatQuotesDashesDE('“Here\'s to the great ones!"');
      expect(result).toEqual('„Here\'s to the great ones!”');
    });
    it('Replaces short dash (with whitespaces) with long em dash', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great - ones!"');
      expect(result).toEqual('„Here\'s to the great — ones!”');
    });
    it('Should not replace short dash (-) with long em dash (—) if no whitespaces in short dash', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great-ones!"');
      expect(result).toEqual('„Here\'s to the great-ones!”');
    });
  });
});
