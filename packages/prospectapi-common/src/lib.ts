/**
 * helper to convert a JS Date to a unix timestamp. note that this will lose
 * millisecond information (as unix timestamps are seconds based).
 *
 * @param date a Date object
 * @returns a unix timestamp number
 */
export const toUnixTimestamp = (date?: Date): number => {
  date = date || new Date();

  // JS `getTime()` returns milliseconds, while unix timestamp expects seconds
  // this is why we divide by 1000
  return Math.floor(date.getTime() / 1000);
};
