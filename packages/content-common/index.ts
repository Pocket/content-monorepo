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


export * from './types';
