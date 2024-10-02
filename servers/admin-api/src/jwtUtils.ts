import jwt, {
  JsonWebTokenError,
  JwtPayload,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthenticationError } from '@pocket-tools/apollo-utils';
import config from './config';
import Sentry from '@sentry/node';

/**
 * Properties of the identity property in CognitoUser below
 */
export interface CoginitoUserIdentity {
  userId: string;
}

/**
 * The properties of the SSO Mozilla user coming through via AWS Cognito.
 */
export interface CognitoUser {
  given_name: string;
  family_name: string;
  name: string;
  email: string;
  'cognito:groups': string[];
  'cognito:username': string;
  'custom:groups': string;
  groups: string[];
  picture: string;
  exp: number;
  iat: number;
  email_verified: string;
  identities: CoginitoUserIdentity[];
}

/**
 * The properties of the SSO Mozilla user that we care about enough to pass on
 * to the subgraphs (`name` is needed for `created_by` and `updated_by` fields
 * in Curated Corpus API, for example, and Cognito groups are needed to figure
 * out privileges across the internal tools).
 */
export interface AdminAPIUser {
  name: string;
  // note these come from the value of `custom:groups`, not `cognito:groups` in CognitoUser
  groups: string[];
  // this value comes from `identities.userId`
  username: string;
}

/**
 * Validates and decodes a JWT into an AdminAPIUser object that will be passed on
 * in the headers to the subgraphs.
 * If validation fails this will error to the client and not return a response
 * This is expected because if a JWT is passed to use then it needs to validate
 * @param rawJwtToken
 * @param publicKeys
 */
export const validateAndGetAdminAPIUser = async (
  rawJwtToken: string,
  publicKeys: Record<string, string>,
): Promise<AdminAPIUser> => {
  const decoded = decodeDataJwt(rawJwtToken);
  // Type for payload is a JwtPayload or a string which breaks the if statement,
  // so we cast to a JwtPayload which it is already.
  const payload = decoded.payload as JwtPayload;
  if (!payload.iss) {
    throw new AuthenticationError(
      'The JWT has no issuer defined, unable to verify',
    );
  }
  try {
    jwt.verify(
      rawJwtToken,
      publicKeys[decoded.header.kid || config.auth.defaultKid],
    );
  } catch (err) {
    console.error('Could not validate jwt', {
      jwt: rawJwtToken,
    });
    if (err instanceof JsonWebTokenError) {
      throw new AuthenticationError(`Could not validate User: ${err.message}`);
    } else if (err instanceof TokenExpiredError) {
      throw new AuthenticationError('Token Expired');
    } else if (err instanceof NotBeforeError) {
      throw new AuthenticationError('Token not yet active');
    } else {
      console.log(err);
      Sentry.captureException(err);
      throw new Error('Internal server error');
    }
  }

  return buildAdminAPIUserFromPayload(decoded.payload as CognitoUser);
};

export const buildAdminAPIUserFromPayload = (
  payload: CognitoUser,
): AdminAPIUser => {
  // the identities array should always have an entry
  const identity = payload.identities[0];

  if (!identity) {
    throw new Error(`JWT payload missing identity information`);
  }

  return {
    name: payload.name,
    groups: JSON.parse(payload['custom:groups']),
    username: identity.userId,
  };
};

//Set the SIGNING key ttl to 1 week.
//This currnetly has not updated on getpocket.com for now so a long ttl is ok
const SIGNING_KEY_TTL = 60 * 60 * 24 * 7;

/**
 * Creates a jwks client
 * @param jwksUri
 */
function getJwksClient(jwksUri: string) {
  return jwksClient({
    jwksUri,
    cache: true, // Default Value
    cacheMaxEntries: 100,
    cacheMaxAge: SIGNING_KEY_TTL,
  });
}

/**
 * Get JWKs from cognito
 */
function getCognitoJwks() {
  const jwksUri = `https://${config.auth.cognito.jwtIssuer}/.well-known/jwks.json`;
  const client = getJwksClient(jwksUri);
  return config.auth.cognito.kids.map((kid: string) =>
    client.getSigningKeyAsync(kid),
  );
}

/**
 * Get JWKs from mozilla auth proxy
 */
function getMozillaAuthProxyJwks() {
  const jwksUri = `https://${config.auth.mozillaAuthProxy.jwtIssuer}/.well-known/jwks.json`;
  const client = getJwksClient(jwksUri);
  return config.auth.mozillaAuthProxy.kids.map((kid: string) =>
    client.getSigningKeyAsync(kid),
  );
}

/**
 * Get JWKs from Pocket
 */
function getPocketJwks() {
  const jwksUri = `https://${config.auth.pocket.jwtIssuer}/.well-known/jwk`;
  const client = getJwksClient(jwksUri);
  return config.auth.pocket.kids.map((kid: string) =>
    client.getSigningKeyAsync(kid),
  );
}

/**
 * Gets the signing key from the issuer server
 * @returns Record of public key string by kid.
 */
export const getSigningKeysFromServer = async (): Promise<
  Record<string, string>
> => {
  const keys = await Promise.all([
    ...getCognitoJwks(),
    ...getMozillaAuthProxyJwks(),
    ...getPocketJwks(),
  ]);

  const publicKeyStringRecords: Record<string, string> = keys.reduce(
    (acc: Record<string, string>, key: jwksClient.SigningKey) => {
      acc[key.kid] = key.getPublicKey();
      return acc;
    },
    {} as Record<string, string>,
  );

  Object.values(publicKeyStringRecords).forEach((publicKeyString: string) => {
    if (!publicKeyString) {
      throw new Error(
        'Unable to get the public key from the issuer to verify the JWT',
      );
    }
  });

  return publicKeyStringRecords;
};

/**
 * Decodes a raw JWT string into  Jwt object
 * @throws AuthenticationError if decoded object is null
 * @param rawJwt raw JWT string
 */
const decodeDataJwt = (rawJwt: string): jwt.Jwt => {
  const decoded = jwt.decode(rawJwt, {
    complete: true,
  });

  if (!decoded) {
    throw new AuthenticationError('Could not decode JWT');
  }

  return decoded;
};
