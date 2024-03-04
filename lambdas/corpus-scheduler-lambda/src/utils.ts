import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwkToPem = require('jwk-to-pem');
import config from './config';
import { validateCandidate } from './validation';
import {
  ApprovedItemAuthor,
  CreateApprovedItemInput,
  CorpusLanguage,
  UrlMetadata,
  ScheduledItemSource,
} from 'content-common/types';
import {
  allowedScheduledSurfaces,
  ScheduledCandidate,
  ScheduledCandidates,
} from './types';
import { assert } from 'typia';
import { SQSRecord } from 'aws-lambda';
import { createApprovedCorpusItem, fetchUrlMetadata } from './graphQlApiCalls';

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
export function generateJwt(privateKey: any) {
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
export async function getCorpusSchedulerLambdaPrivateKey(secretId: string) {
  try {
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
}

/**
 * Creates an array of ApprovedItemAuthor from a comma separated string of authors
 * @param authors comma separated string of authors ordered by contribution (from the Parser)
 * @return ApprovedItemAuthor[]
 */
export const mapAuthorToApprovedItemAuthor = (
  authors: string[],
): ApprovedItemAuthor[] => {
  return authors.map((author, index) => {
    return { name: author, sortOrder: index + 1 };
  });
};

/**
 * Creates a scheduled item to send to createApprovedCorpusItem mutation
 * @param candidate ScheduledCandidate received from Metaflow
 * @param itemMetadata UrlMetadata item from Parser
 * @return CreateApprovedItemInput
 */
export const mapScheduledCandidateInputToCreateApprovedItemInput = async (
  candidate: ScheduledCandidate,
  itemMetadata: UrlMetadata,
): Promise<CreateApprovedItemInput> => {
  try {
    // the following fields are from Metaflow source & already validated
    const source = candidate.scheduled_corpus_item.source;
    const topic = candidate.scheduled_corpus_item.topic;

    // the following fields are from primary source = Metaflow, fallback on Parser input
    const title = (
      candidate.scheduled_corpus_item.title
        ? candidate.scheduled_corpus_item.title
        : itemMetadata.title
    ) as string;
    const excerpt = (
      candidate.scheduled_corpus_item.excerpt
        ? candidate.scheduled_corpus_item.excerpt
        : itemMetadata.excerpt
    ) as string;
    // using toUpperCase on language returned from parser, as parser returns 'en' instead of 'EN'
    const language = (
      candidate.scheduled_corpus_item.language
        ? candidate.scheduled_corpus_item.language
        : (itemMetadata.language!.toUpperCase() as CorpusLanguage)
    ) as string;
    const imageUrl = (
      candidate.scheduled_corpus_item.image_url
        ? candidate.scheduled_corpus_item.image_url
        : itemMetadata.imageUrl
    ) as string;

    // the following fields are from primary source = Parser
    const publisher = itemMetadata.publisher as string;
    //Metaflow only grabs the first author even if there are more than 1 authors present, so grab authors from Parser
    const authors = mapAuthorToApprovedItemAuthor(
      itemMetadata.authors!.split(','),
    );

    const itemToSchedule: CreateApprovedItemInput = {
      url: candidate.scheduled_corpus_item.url, // source = Metaflow
      title: title,
      excerpt: excerpt,
      status: candidate.scheduled_corpus_item.status, // source = Metaflow
      language: language,
      publisher: publisher,
      authors: authors,
      imageUrl: imageUrl,
      topic: topic,
      source: source, // source = Metaflow
      scheduledSource: source as unknown as ScheduledItemSource.ML,
      isCollection: itemMetadata.isCollection as boolean, // source = Parser
      isSyndicated: itemMetadata.isSyndicated as boolean, // source = Parser
      isTimeSensitive: false,
      scheduledDate: candidate.scheduled_corpus_item.scheduled_date, // source = Metaflow
      scheduledSurfaceGuid:
        candidate.scheduled_corpus_item.scheduled_surface_guid, // source = Metaflow
    };
    // assert itemToSchedule against CreateApprovedItemInput before sending to mutation
    assert<CreateApprovedItemInput>(itemToSchedule);
    return itemToSchedule;
  } catch (e) {
    throw new Error(
      `failed to map ${candidate.scheduled_corpus_candidate_id} to CreateApprovedItemInput. Reason: ${e}`,
    );
  }
};

/**
 * Process each record from SQS. Transforms Metaflow input into CreateApprovedItemInput & calls the
 * createApprovedCorpusItem mutation
 * @param record an SQSRecord
 */
export const processAndScheduleCandidate = async (
  record: SQSRecord,
): Promise<void> => {
  const parsedMessage: ScheduledCandidates = JSON.parse(record.body);

  // traverse through the parsed candidates array
  for (const candidate of parsedMessage.candidates) {
    try {
      // 1. validate scheduled candidate from Metaflow
      await validateCandidate(candidate);

      // 2. get metadata from Parser (used to fill in some data fields not provided by Metaflow)
      const parserMetadata = await fetchUrlMetadata(
        candidate.scheduled_corpus_item.url,
      );

      // 3. map Metaflow input to CreateApprovedItemInput
      const createApprovedItemInput =
        await mapScheduledCandidateInputToCreateApprovedItemInput(
          candidate,
          parserMetadata,
        );

      // if dev & scheduled surface exists in allowed scheduled surfaces, send the candidate to the mutation
      // TODO: schedule to production
      if (
        config.app.isDev ||
        allowedScheduledSurfaces.includes(
          createApprovedItemInput.scheduledSurfaceGuid as string,
        )
      ) {
        // call createApprovedCorpusItem mutation
        const createdItem = await createApprovedCorpusItem(
          createApprovedItemInput,
        );
        console.log(
          `CreateApprovedCorpusItem MUTATION OUTPUT: externalId: ${createdItem.data.createApprovedCorpusItem.externalId}, url: ${createdItem.data.createApprovedCorpusItem.url}, title: ${createdItem.data.createApprovedCorpusItem.title}`,
        );
      } else {
        console.log(
          `Cannot schedule candidate: ${candidate.scheduled_corpus_candidate_id} for surface ${createApprovedItemInput.scheduledSurfaceGuid}.`,
        );
      }
    } catch (error) {
      throw new Error(`processSQSMessages failed: ${error}`);
    }
  }
};
