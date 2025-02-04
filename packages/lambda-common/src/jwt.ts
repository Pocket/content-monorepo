import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwkToPem = require('jwk-to-pem');

import config from './config';

// this is the required subset of properties required by the admin-api gateway
// https://github.com/Pocket/admin-api/blob/a0bb468cece3ba5bc1a00e1098652a49d433a81d/src/jwtUtils.ts#L98
// https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.ts
type JwtPayload = {
  'custom:groups': string; // json enconded string - array of groups
  aud: string;
  exp: number;
  iat: number; //timestamp
  identities: { userId: string }[];
  iss: string;
  name: string;
};

// config necessary to build payload for signing a JWT
export type JwtConfig = {
  aud: string;
  groups: string[];
  iss: string;
  name: string;
  userId: string;
};

// reference to secrets manager client
let smClient: SecretsManagerClient;

/**
 * lazy instantiation/retrieval of secrets manager client
 *
 * @returns SecretsManagerClient
 */
const getSecretsManagerClient = (): SecretsManagerClient => {
  if (!smClient) {
    smClient = new SecretsManagerClient({ region: config.aws.region });
  }

  return smClient;
};

/**
 * Generates jwt token from the given private key.
 * @param privateKey
 * https://www.npmjs.com/package/jsonwebtoken
 * referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.ts
 */
export const generateJwt = (config: JwtConfig, privateKey: any): string => {
  const now = Math.round(Date.now() / 1000);

  const payload: JwtPayload = {
    iss: config.iss,
    aud: config.aud,
    iat: now,
    exp: now + 60 * 10, //expires in 10 mins.
    name: config.name,
    identities: [{ userId: config.userId }],
    // this group gives us full access in corpus API
    'custom:groups': JSON.stringify(config.groups),
  };

  return jwt.sign(payload, jwkToPem(privateKey, { private: true }), {
    algorithm: 'RS256',
    // Required by admin-api to disambiguate from other key(s)
    keyid: privateKey.kid,
  });
};

/**
 * retrieves the JWT_KEY for the given lambda from secrets manager
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-secrets-manager/classes/getsecretvaluecommand.html
 * referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/secretManager.ts
 */
export const getLambdaPrivateJwtKey = async (secretId: string) => {
  try {
    const smClient = getSecretsManagerClient();

    const secret = await smClient.send(
      new GetSecretValueCommand({
        SecretId: secretId,
      }),
    );

    const privateKey = secret.SecretString as string;

    return JSON.parse(privateKey);
  } catch (e) {
    throw new Error('unable to fetch private key' + e);
  }
};

/**
 * generates a bearer token string to include in HTTP Authentication header
 *
 * @param jwt string
 * @returns string
 */
export const generateBearerToken = (jwt: string): string => {
  return 'Bearer '.concat(jwt);
};
