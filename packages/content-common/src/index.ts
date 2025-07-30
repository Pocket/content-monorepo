import { SEPARATORS, stop } from './types';

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

/**
 * Format a string: Match the letter after an apostrophe & capture the apostrophe and matched char.
 * Lowercase the captured letter & return the formatted string.
 * @param input
 * @returns {string}
 */
export const lowercaseAfterApostrophe = (input: string): string => {
  // Match either an ASCII or curly apostrophe followed by a letter, after a word character.
  const regex = /(?<=\w)(['\u2018\u2019])(\w)/g;
  return input.replace(regex, (_, apostrophe, letter) => `${apostrophe}${letter.toLowerCase()}`);
};

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
export const applyApTitleCase = (value: string): string => {
  // Split and filter empty strings
  // Boolean here acts as a callback, evaluates each word:
  // If it's a non-empty string, keep the word in the array;
  // If it's an empty string (or falsy), remove from array.
  const allWords = value.split(SEPARATORS).filter(Boolean); // Split and filter empty strings

  const result = allWords
    .map((word, index, all) => {
      const isAfterColon = index > 0 && all[index - 1].trim() === ':';

      const isAfterQuote =
        index > 0 &&
        (allWords[index - 1] === "'" ||
          allWords[index - 1] === '"' ||
          allWords[index - 1] === '\u2018' || // Opening single quote ’
          allWords[index - 1] === '\u201C'); // Opening double quote “

      if (
        index === 0 || // first word
        index === all.length - 1 || // last word
        isAfterColon || // capitalize the first word after a colon
        isAfterQuote || // capitalize the first word after a quote
        !stop.includes(word.toLowerCase()) // not a stop word
      ) {
        return capitalize(word);
      }

      return word.toLowerCase();
    })
    .join(''); // join without additional spaces
  return lowercaseAfterApostrophe(result);
};

/**
 * Helper to replace opening and closing curly single and double quotes for English
 * Curly quotes represented in unicode
 * adapted from https://gist.github.com/drdrang/705071
 *
 * @param text
 * @returns string
 */
export const formatQuotesEN = (text: string): string => {
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
export const formatQuotesDashesDE = (text: string): string => {
  return text
    .replace(/(^|[-\u2014/([{\u2018\s])\u00AB/g, '$1\u201E') // Replaces opening « with „
    .replace(/(^|[-\u2014/([{\u2018\s])\u00BB/g, '$1\u201E') // Replaces opening » with „
    .replace(/\u00BB/g, '\u201D') // Replaces closing » with ”
    .replace(/\u00AB/g, '\u201D') // Replaces closing « with ”
    .replace(/(^|[-\u2014/([{\u2018\s])"/g, '$1\u201E') // Opening doubles (replaces opening " with „)
    .replace(/"/g, '\u201D') // Closing doubles (replaces closing " with ”)
    .replace(/(^|[-\u2014/([{\u2018\s])\u201c/g, '$1\u201E') // Replaces opening “ with „
    .replace(/\s\u2014\s/g, ' \u2013 ') // Replace em dash (—) with en dash (–)
    .replace(/\s-\s/g, ' \u2013 '); // Replace short dash (-) with long en dash (–)
};

export * from './types';
export * from './snowplow/index';
export * from './snowplow/test-helpers';
