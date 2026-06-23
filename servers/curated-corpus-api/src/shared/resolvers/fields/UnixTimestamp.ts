/**
 * Return a Unix timestamp (in seconds, not milliseconds unlike what
 * the JS Date->getTime() method provides) for a given JS Date object.
 *
 * Prisma returns a JavaScript Date object that it generates from the value
 * in a MySQL `DATETIME` field.
 *
 * Additionally, when inserting values *into* the database, Prisma automatically
 * converts the timestamp to a UTC datetime string,so no additional manipulation
 * is required before converting the Date object to a Unix timestamp.
 *
 * @param parent
 * @param args
 * @param context
 * @param info
 * @constructor
 */
export const UnixTimestampResolver = (parent, args, context, info) => {
  return getUnixTimestamp(parent[info.fieldName]);
};

/**
 * Generate an integer Epoch time from a JavaScript Date object.
 *
 * @param date
 */
export const getUnixTimestamp = (date: Date): number | null => {
  if (!date) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
};
