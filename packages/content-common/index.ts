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

export * from './types';
export * from './snowplow';
