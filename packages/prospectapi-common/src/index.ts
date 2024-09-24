// i don't love combining all of this - types, db functions, lib functions - in
// a single entrypoint, BUT typescript (as of 2021-12-02) doesn't support
// multiple entry points in package.json - so we're kind of stuck with this.

export { DynamoItem, GetProspectsFilters, Prospect } from './types';
export { ScheduledSurfaces, ScheduledSurface } from 'content-common';
export { toUnixTimestamp, deriveUrlMetadata } from './lib';
export {
  scanAllRows,
  generateInsertParams,
  truncateDb,
  insertProspect,
  getProspectById,
} from './dynamodb';
export { dbClient } from './dynamodb-client';
