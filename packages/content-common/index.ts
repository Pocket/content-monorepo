import {
  SEPARATORS,
  stop
} from './types';

/**
 * takes a comma separated string and returns an array of strings
 * @param reasonCsv a string of comma separated values or null
 * @param maxLength the maximum length a single reason can be
 * @returns a string array
 */
export const parseReasonsCsv = (
  reasonCsv: string | null,
  maxLength: number,
): string[] => {
  // if a csv of reasons was provided, split the comma separated string of
  // reasons into an array
  let sanitizedReasons: string[] = [];

  if (reasonCsv) {
    // remove any reasons that don't fit our sanitization rules
    sanitizedReasons = reasonCsv.split(',').reduce((acc, reason): string[] => {
      const sanitized = sanitizeText(reason, maxLength);

      if (sanitized.length) {
        acc.push(sanitized);
      }

      return acc;
    }, sanitizedReasons);
  }

  return sanitizedReasons;
};

/**
 * basic text sanitization function for cleaning free text entered by curators
 * @param input unsanitized string
 * * @param maxLength the maximum returned length allowed
 * @returns sanitized string
 */
export const sanitizeText = (input: string, maxLength: number): string => {
  // remove all non-allowed characters and buffering whitespace
  let sanitized = input.replace(/[^a-zA-Z0-9_ \-.!?]/g, '').trim();

  // collapse more than one consecutive space into a single space
  sanitized = sanitized.replace(/  +/g, ' ');

  // trim to conform to our max length
  return sanitized.substring(0, maxLength - 1);
};

/* Taken from https://github.com/Pocket/curation-admin-tools/blob/main/src/_shared/utils/applyApTitleCase.ts*/
/**
 * Capitalize first character for string
 *
 * @param {string} value
 * @returns {string}
 */
export const capitalize = (value: string): string => {
  if (!value) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Helper to convert text to AP title case
 * adapted from https://github.com/words/ap-style-title-case
 * text should match https://headlinecapitalization.com/
 *
 * @param {string} [value]
 * @returns {string}
 */
export const applyApTitleCase = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  // split by separators, check if word is first or last
  // or not blacklisted, then capitalize
  return value
      .split(SEPARATORS)
      .map((word, index, all) => {
        if (
            index === 0 ||
            index === all.length - 1 ||
            !stop.includes(word.toLowerCase())
        ) {
          return capitalize(word);
        }
        return word.toLowerCase();
      })
      .join('');
};

/**
 * Helper to replace opening and closing curly single and double quotes for English
 * Curly quotes represented in unicode
 * adapted from https://gist.github.com/drdrang/705071
 *
 * @param text
 * @returns string
 */

export const formatQuotesEN = (text: string): string | undefined => {
  if (!text) {
    return undefined;
  }
  return text
      .replace(/(^|[-\u2014/([{"\s])'/g, '$1\u2018') // Opening singles (replaces opening ' with ‘)
      .replace(/'/g, '\u2019') // Closing singles & apostrophes (replaces closing ' with ’)
      .replace(/(^|[-\u2014/([{\u2018\s])"/g, '$1\u201c') // Opening doubles (replaces opening " with “)
      .replace(/"/g, '\u201d'); // Closing doubles (replaces closing " with ”)
};

/**
 * Helper to replace opening and closing quotes, arrow brackets (» «) for German
 * Quotes represented in unicode
 *
 * @param text
 * @returns string
 */

export const formatQuotesDashesDE = (text: string): string | undefined => {
  if (!text) {
    return undefined;
  }
  return text
      .replace(/(^|[-\u2014/([{\u2018\s])\u00AB/g, '$1\u201E') // Replaces opening « with „
      .replace(/\u00BB/g, '\u201D') // Replaces closing » with ”
      .replace(/(^|[-\u2014/([{\u2018\s])"/g, '$1\u201E') // Opening doubles (replaces opening " with „)
      .replace(/"/g, '\u201D') // Closing doubles (replaces closing " with ”)
      .replace(/(^|[-\u2014/([{\u2018\s])\u201c/g, '$1\u201E') // Replaces opening “ with „
      .replace(/\s\u2013\s/g, ' \u2014 ') // Replace en dash (–) with long em dash (—)
      .replace(/\s-\s/g, ' \u2014 '); // Replace short dash (-) with long em dash (—)
};



export * from './types';
