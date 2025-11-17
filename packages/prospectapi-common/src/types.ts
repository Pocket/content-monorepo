// much of the data in this file comes from our shared data repository, which
// currently is a confluence doc:
// https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { ProspectType, Topics } from 'content-common';

// this is the structure of an `Item` as returned by dynamo
// just a convenience return type
export type DynamoItem =
  | {
      [key: string]: NativeAttributeValue;
    }
  | undefined;

// this is the type used in most of the code and in dynamo
export type Prospect = {
  // a GUID we generate prior to inserting into dynamo
  id: string;
  // the prospect ID supplied by ML
  prospectId: string;
  // this will match the name in ScheduledSurfaces (below)
  // should this map to that type? would make lookups/type validation a pain...
  // however, this value *is* validated against the array below when coming
  // from sqs/before being inserted into dynamo, so checking does occur
  scheduledSurfaceGuid: string;
  topic?: Topics;
  prospectType: ProspectType;
  url: string;
  saveCount: number;
  rank: number;
  curated?: boolean;
  // unix timestamp
  createdAt?: number;
  // below properties will be populated via client api/parser
  domain?: string;
  excerpt?: string;
  imageUrl?: string;
  language?: string;
  publisher?: string;
  title?: string;
  isSyndicated?: boolean;
  isCollection?: boolean;
  // authors will be a comma separated string
  authors?: string;
  approvedCorpusItem?: { url: string };
  rejectedCorpusItem?: { url: string };
};

// all the filters on the `getProspects` query
export type GetProspectsFilters = {
  scheduledSurfaceGuid: string;
  prospectType?: ProspectType;
  includePublisher?: string;
  excludePublisher?: string;
};
