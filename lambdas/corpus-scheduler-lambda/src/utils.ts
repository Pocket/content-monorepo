import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import config from './config';

// Secrets Manager Client
const smClient = new SecretsManagerClient({ region: config.aws.region });

// this is the required subset of properties required by the admin-api gateway
// https://github.com/Pocket/admin-api/blob/a0bb468cece3ba5bc1a00e1098652a49d433a81d/src/jwtUtils.ts#L98
// https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.ts
type JwtPayload = {
    iss: string;
    aud: string;
    iat: number; //timestamp
    exp: number;
    name: string;
    'custom:groups': string; // json enconded string - array of groups
    identities: { userId: string }[];
};

/**
 * Generates jwt token from the given private key.
 * @param privateKey
 * https://www.npmjs.com/package/jsonwebtoken
 * referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.ts
 */
export function generateJwt(privateKey) {
    const now = Math.round(Date.now() / 1000);

    const payload: JwtPayload = {
        iss: config.jwt.iss,
        aud: config.jwt.aud,
        iat: now,
        exp: now + 60 * 5, //expires in 5 mins
        name: config.jwt.name,
        identities: [{ userId: config.jwt.userId }],
        // this group gives us full access in corpus API
        'custom:groups': JSON.stringify(config.jwt.groups),
    };

    return jwt.sign(payload, jwkToPem(privateKey, { private: true }), {
        algorithm: 'RS256',
        // Required by admin-api to disambiguate from other key(s)
        keyid: privateKey.kid,
    });
}

/**
 * retrieves the JWT_KEY for CorpusLambdaScheduler from secrets manager
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-secrets-manager/classes/getsecretvaluecommand.html
 * referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/secretManager.ts
 */
export async function getCorpusSchedulerLambdaPrivateKey() {
    try {
        const secret = await smClient.send(
            new GetSecretValueCommand({
                SecretId: config.jwt.key,
            }),
        );

        const privateKey = secret.SecretString as string;
        return JSON.parse(privateKey);
    } catch (e) {
        throw new Error('unable to fetch private key' + e);
    }
}
