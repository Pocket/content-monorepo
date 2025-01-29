import {
  generateBearerToken,
  generateJwt,
  getLambdaPrivateJwtKey,
  JwtConfig,
} from 'lambda-common';

import config from './config';

/**
 * calls a few common functions to procure a bearer token for including in
 * queries to the graph
 *
 * @returns Promise that resolves a string
 */
export const getJwtBearerToken = async (): Promise<string> => {
  // admin api requires jwt token, generate it once
  // to avoid hitting secrets managers in AWS several times per candidate
  const jwtPrivateKey = await getLambdaPrivateJwtKey(config.jwt.key);

  const jwtConfig: JwtConfig = {
    aud: config.jwt.aud,
    groups: config.jwt.groups,
    iss: config.jwt.iss,
    name: config.jwt.name,
    userId: config.jwt.userId,
  };

  const jwt = generateJwt(jwtConfig, jwtPrivateKey);

  return generateBearerToken(jwt);
};
