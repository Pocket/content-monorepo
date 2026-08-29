import {
  applyApTitleCase,
  formatQuotesDashesDE,
  formatQuotesEN,
  capitalize,
  parseReasonsCsv,
  sanitizeText,
  lowercaseAfterApostrophe,
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
    it('should capitalize the first char of a string', () => {
      const string = 'a random string';
      const output = capitalize(string);
      expect(output).toEqual('A random string');
    });
  });

  describe('applyApTitleCase', () => {
    it('should format string correctly using AP style', () => {
      const stringToFormat = 'a random String to format! random-string:Random!';
      const output = applyApTitleCase(stringToFormat);
      expect(output).toEqual(
        'A Random String to Format! Random-String:Random!',
      );
    });
    it('should differentiate between strings in quotes and apostrophe', () => {
      const sentencesWithContractions = [
        {
          result: "Here's what you haven't noticed 'foo bar' foo'S",
          expected: "Here's What You Haven't Noticed 'Foo Bar' Foo's",
        },
      ];
      sentencesWithContractions.forEach((swc) => {
        expect(applyApTitleCase(swc.result)).toEqual(swc.expected);
      });
    });

    it('should capitalize after a colon (:)', () => {
      const sentencesWithContractions = [
        {
          result: "Here's what you haven't noticed 'foo bar' foo'S: foo Bar",
          expected: "Here's What You Haven't Noticed 'Foo Bar' Foo's: Foo Bar",
        },
      ];
      sentencesWithContractions.forEach((swc) => {
        expect(applyApTitleCase(swc.result)).toEqual(swc.expected);
      });
    });
    it('should correctly format titles with curly apostrophes', () => {
      const testCases = [
        {
          result: "every state\u2018S dream travel destination, mapped",
          expected: "Every State\u2018s Dream Travel Destination, Mapped",
        },
      ];
      testCases.forEach(({ result, expected }) => {
        expect(applyApTitleCase(result)).toEqual(expected);
      });
    });

    it('should capitalize "a" and "the" after sentence-ending punctuation', () => {
      const testCases = [
        {
          result: 'Nazi Persecution Scattered My Family. a Lost Archive Brought Us Together',
          expected: 'Nazi Persecution Scattered My Family. A Lost Archive Brought Us Together',
        },
        {
          result: 'This is the end! the beginning starts now',
          expected: 'This Is the End! The Beginning Starts Now',
        },
        {
          result: 'What happened? a miracle occurred',
          expected: 'What Happened? A Miracle Occurred',
        },
        {
          result: 'She said "Hello." the crowd cheered',
          expected: 'She Said "Hello." The Crowd Cheered',
        },
      ];
      testCases.forEach(({ result, expected }) => {
        expect(applyApTitleCase(result)).toEqual(expected);
      });
    });

    it('should always format iPhone correctly', () => {
      const testCases = [
        {
          result: 'the new Iphone is amazing',
          expected: 'The New iPhone Is Amazing',
        },
        {
          result: 'IPHONE users love their devices',
          expected: 'iPhone Users Love Their Devices',
        },
        {
          result: 'my iphone broke yesterday',
          expected: 'My iPhone Broke Yesterday',
        },
      ];
      testCases.forEach(({ result, expected }) => {
        expect(applyApTitleCase(result)).toEqual(expected);
      });
    });

    it('should always lowercase "vs."', () => {
      const testCases = [
        {
          result: 'Apple Vs. Samsung: the battle continues',
          expected: 'Apple vs. Samsung: The Battle Continues',
        },
        {
          result: 'Batman VS. Superman was a movie',
          expected: 'Batman vs. Superman Was a Movie',
        },
        {
          result: 'Good vs Evil: a timeless struggle',
          expected: 'Good vs. Evil: A Timeless Struggle',
        },
      ];
      testCases.forEach(({ result, expected }) => {
        expect(applyApTitleCase(result)).toEqual(expected);
      });
    });

    it('should not capitalize "as" in title case', () => {
      const testCases = [
        {
          result: 'Working As a Team Is Important',
          expected: 'Working as a Team Is Important',
        },
        {
          result: 'As The Sun Sets',
          expected: 'As the Sun Sets',
        },
        {
          result: 'She Sees It As An Opportunity',
          expected: 'She Sees It as an Opportunity',
        },
      ];
      testCases.forEach(({ result, expected }) => {
        expect(applyApTitleCase(result)).toEqual(expected);
      });
    });
  });
  describe('lowercaseAfterApostrophe', () => {
    it('lowercase letter after apostrophe & return new string', () => {
      const result = lowercaseAfterApostrophe("foo'S");
      expect(result).toEqual("foo's");
    });
    it('lowercase the first letter after apostrophe, ignore string in quotes, & return new string', () => {
      const result = lowercaseAfterApostrophe(
        "'Foo' foo'S DaY's You'Ll 'foo Bar foo'Ss'",
      );
      expect(result).toEqual("'Foo' foo's DaY's You'll 'foo Bar foo'ss'");
    });
    it('should lowercase the letter after a curly apostrophe', () => {
      const input = "Every State\u2018S Dream Travel Destination, Mapped";
      const expected = "Every State\u2018s Dream Travel Destination, Mapped";
      expect(lowercaseAfterApostrophe(input)).toEqual(expected);
    });
  });
  // taken from curation admin tools
  describe('formatQuotesEN', () => {
    it('should return an empty string if text is an empty string', () => {
      // empty string
      const output = formatQuotesEN('');
      expect(output).toEqual('');
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
        'I tried the workout, and it did more than expected. "Fitness is for Everyone."',
      );
      expect(result).toEqual(
        'I tried the workout, and it did more than expected. “Fitness is for Everyone.”',
      );
    });
  });

  describe('formatQuotesDashesDE', () => {
    it('should return an empty string if text is an empty string', () => {
      // empty string
      const output = formatQuotesDashesDE('');
      expect(output).toEqual('');
    });
    it('Successfully does all replacements', () => {
      const result = formatQuotesDashesDE(
        `“Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus “Tote Mädchen lügen nicht” und “Élite” – das musst du darüber wissen`,
      );
      expect(result).toEqual(
        '„Nicht eine mehr”: Diese spanische Netflix-Serie ist ein Mix aus „Tote Mädchen lügen nicht” und „Élite” – das musst du darüber wissen',
      );
    });
    it('Replaces opening « with „', () => {
      const result = formatQuotesDashesDE("«Here's to the great ones!");
      expect(result).toEqual("„Here's to the great ones!");
    });
    it('Replaces closing » with “', () => {
      const result = formatQuotesDashesDE("Here's to the great ones!»");
      expect(result).toEqual("Here's to the great ones!”");
    });
    it("Replaces «Here's to the great ones!» with „Here's to the great ones!”", () => {
      const result = formatQuotesDashesDE("«Here's to the great ones!»");
      expect(result).toEqual("„Here's to the great ones!”");
    });
    it('Replaces »example« with „example”', () => {
      const result = formatQuotesDashesDE('»example«');
      expect(result).toEqual('„example”');
    });
    it('Replaces opening " with „', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great ones!');
      expect(result).toEqual("„Here's to the great ones!");
    });
    it('Replaces closing " with “', () => {
      const result = formatQuotesDashesDE('Here\'s to the great ones!"');
      expect(result).toEqual("Here's to the great ones!”");
    });
    it('Replaces opening " with „ and closing " with “', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great ones!"');
      expect(result).toEqual("„Here's to the great ones!”");
    });
    it('Replaces opening “ with „', () => {
      const result = formatQuotesDashesDE('“Here\'s to the great ones!"');
      expect(result).toEqual("„Here's to the great ones!”");
    });
    it('Replaces short dash (with whitespaces) with long en dash', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great - ones!"');
      expect(result).toEqual("„Here's to the great – ones!”");
    });
    it('Replaces long em dash (–) (with whitespaces) with long en dash', () => {
      const result = formatQuotesDashesDE(
        '"Meeresregionen — in die pelagischen Zonen — verlegt"',
      );
      expect(result).toEqual(
        '„Meeresregionen – in die pelagischen Zonen – verlegt”',
      );
    });
    it('Should not replace short dash (-) with long en dash (–) if no whitespaces in short dash', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great-ones!"');
      expect(result).toEqual("„Here's to the great-ones!”");
    });
    it('Should not replace em dash (—) with long en dash (–) if no whitespaces in em dash', () => {
      const result = formatQuotesDashesDE('"Here\'s to the great—ones!"');
      expect(result).toEqual("„Here's to the great—ones!”");
    });
  });
});
