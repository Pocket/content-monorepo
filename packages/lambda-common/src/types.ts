// data we expect back from calling getApprovedCorpusItemByUrl
export interface ApprovedCorpusItemOutput {
  externalId: string;
  url: string;
}

// required with any call to the graph
export type GraphQlApiCallHeaders = {
  'apollographql-client-name': string;
  'apollographql-client-version': string;
  'Content-Type': 'application/json';
  Authorization: string;
};

// config necessary to build payload for signing a JWT
export type JwtConfig = {
  aud: string;
  groups: string[];
  iss: string;
  name: string;
  userId: string;
};

// this is the required subset of properties required by the admin-api gateway
// https://github.com/Pocket/admin-api/blob/a0bb468cece3ba5bc1a00e1098652a49d433a81d/src/jwtUtils.ts#L98
// https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.ts
export type JwtPayload = {
  'custom:groups': string; // json enconded string - array of groups
  aud: string;
  exp: number;
  iat: number; //timestamp
  identities: { userId: string }[];
  iss: string;
  name: string;
};
