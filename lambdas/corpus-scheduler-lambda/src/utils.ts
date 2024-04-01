import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import config from './config';
import {validateCandidate, validateImageUrl} from './validation';
import {
  ApprovedItemAuthor,
  CorpusLanguage,
  CreateApprovedItemInput,
  ScheduledItemSource,
  CreateScheduledItemInput,
  UrlMetadata,
} from 'content-common';
import {
  allowedScheduledSurfaces,
  ScheduledCandidate,
  ScheduledCandidates,
} from './types';
import { assert, TypeGuardError } from 'typia';
import { SQSRecord } from 'aws-lambda';
import {
  createApprovedAndScheduledCorpusItem,
  createScheduledCorpusItem,
  fetchUrlMetadata,
  getApprovedCorpusItemByUrl,
} from './graphQlApiCalls';
import {
  generateSnowplowErrorEntity,
  generateSnowplowSuccessEntity,
  queueSnowplowEvent,
} from './events/snowplow';
import { getEmitter, getTracker } from 'content-common/snowplow';
import { SnowplowScheduledCorpusCandidateErrorName } from './events/types';
import * as Sentry from '@sentry/node';
import { Tracker } from '@snowplow/node-tracker';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwkToPem = require('jwk-to-pem');

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
 * @param e Error raised by Typia assert<CreateApprovedItemInput>
 * @return Snowplow error corresponding to e if one exists, otherwise undefined.
 */
function mapApprovedItemInputTypiaErrorToSnowplowError(
  e: TypeGuardError,
): SnowplowScheduledCorpusCandidateErrorName | undefined {
  switch (e.path) {
    case '$input.imageUrl':
      return SnowplowScheduledCorpusCandidateErrorName.MISSING_IMAGE;
    case '$input.title':
      return SnowplowScheduledCorpusCandidateErrorName.MISSING_TITLE;
    case '$input.excerpt':
      return SnowplowScheduledCorpusCandidateErrorName.MISSING_EXCERPT;
  }
}

/**
 *
 * @param e Error raised by Typia assert<CreateApprovedItemInput>
 * @param candidate
 */
function handleApprovedItemInputTypiaError(
  e: TypeGuardError,
  candidate: ScheduledCandidate,
) {
  const snowplowError = mapApprovedItemInputTypiaErrorToSnowplowError(e);
  if (snowplowError) {
    const emitter = getEmitter();
    const tracker = getTracker(emitter, config.snowplow.appId);
    queueSnowplowEvent(
      tracker,
      generateSnowplowErrorEntity(candidate, snowplowError, e.message),
    );
    emitter.flush();
  }
}

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
    // validate image_url (Metaflow or Parser input, whichever is provided)
    const imageUrl = (
      candidate.scheduled_corpus_item.image_url
        ? await validateImageUrl(candidate.scheduled_corpus_item.image_url)
        : await validateImageUrl(itemMetadata.imageUrl as string)
    ) as string;

    // the following fields are from primary source = Parser
    const publisher = itemMetadata.publisher as string;
    // Metaflow only grabs the first author even if there are more than 1 author present, so grab authors from Parser
    // if Parser cannot return authors, default to Metaflow then
    const authors = itemMetadata.authors
      ? mapAuthorToApprovedItemAuthor(itemMetadata.authors!.split(','))
      : mapAuthorToApprovedItemAuthor(candidate.scheduled_corpus_item.authors!);

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
    if (e instanceof TypeGuardError) {
      handleApprovedItemInputTypiaError(e, candidate);
    }

    throw new Error(
      `failed to map ${candidate.scheduled_corpus_candidate_id} to CreateApprovedItemInput. Reason: ${e}`,
    );
  }
};

/**
 * Creates CreateScheduledItemInput to schedule an approved corpus item
 * @param candidate ScheduledCandidate received from Metaflow
 * @param approvedItemExternalId external id for an already approved corpus item
 * @return CreateScheduledItemInput
 */
export const createCreateScheduledItemInput = async (
  candidate: ScheduledCandidate,
  approvedItemExternalId: string,
): Promise<CreateScheduledItemInput> => {
  try {
    const itemToSchedule: CreateScheduledItemInput = {
      approvedItemExternalId: approvedItemExternalId,
      scheduledSurfaceGuid:
        candidate.scheduled_corpus_item.scheduled_surface_guid,
      scheduledDate: candidate.scheduled_corpus_item.scheduled_date,
      source: candidate.scheduled_corpus_item
        .source as unknown as ScheduledItemSource,
    };
    // assert itemToSchedule against CreateScheduledItemInput before sending to mutation
    assert<CreateScheduledItemInput>(itemToSchedule);
    return itemToSchedule;
  } catch (e) {
    throw new Error(
      `failed to create CreateScheduledItemInput for ${candidate.scheduled_corpus_candidate_id}. Reason: ${e}`,
    );
  }
};

/**
 * Creates, approves, schedules OR only schedules a candidate.
 * @param candidate ScheduledCandidate received from Metaflow
 * @param bearerToken generated bearerToken for admin api
 * @param tracker
 */
export const createAndScheduleCorpusItemHelper = async (
  candidate: ScheduledCandidate,
  bearerToken: string,
  tracker: Tracker,
) => {
  let approvedCorpusItemId, scheduledItemId;

  // 1. query getApprovedCorpusItemByUrl to check if item is already created & approved
  const approvedCorpusItem = await getApprovedCorpusItemByUrl(
    candidate.scheduled_corpus_item.url,
    bearerToken,
  );
  // if getApprovedCorpusItemByUrl mutation returns null, this is a new candidate
  // create, approve & schedule it
  if (!approvedCorpusItem) {
    // 2. get metadata from Parser (used to fill in some data fields not provided by Metaflow)
    const parserMetadata = await fetchUrlMetadata(
      candidate.scheduled_corpus_item.url,
      bearerToken,
    );

    // 3. map Metaflow input to CreateApprovedItemInput
    const createApprovedItemInput =
      await mapScheduledCandidateInputToCreateApprovedItemInput(
        candidate,
        parserMetadata,
      );

    // 4. call createApprovedCorpusItem mutation
    const approvedCorpusItemWithScheduleHistory =
      await createApprovedAndScheduledCorpusItem(
        createApprovedItemInput,
        bearerToken,
      );

    // Set the approved and scheduled ids needed for Snowplow.
    approvedCorpusItemId = approvedCorpusItemWithScheduleHistory.externalId;
    // We know that scheduledSurfaceHistory has exactly 1 element, because the corpus item did not
    // exist before the above mutation, and therefore could not have been scheduled before.
    scheduledItemId =
      approvedCorpusItemWithScheduleHistory.scheduledSurfaceHistory[0]
        .externalId;
  }
  // item has already been created & approved, try scheduling item
  else {
    // 5. create CreateScheduledItem input obj
    const createScheduledItemInput = await createCreateScheduledItemInput(
      candidate,
      approvedCorpusItem.externalId,
    );
    // 6.  call createScheduledItemInput mutation
    const scheduledItem = await createScheduledCorpusItem(
      createScheduledItemInput,
      bearerToken,
    );

    // Set the approved and scheduled ids needed for Snowplow.
    approvedCorpusItemId = approvedCorpusItem.externalId;
    scheduledItemId = scheduledItem.externalId;
  }

  // 7. Send a Snowplow event after the item got successfully scheduled.
  queueSnowplowEvent(
    tracker,
    generateSnowplowSuccessEntity(
      candidate,
      approvedCorpusItemId,
      scheduledItemId,
    ),
  );
};

/**
 * Process each record from SQS.
 * @param record an SQSRecord
 * @param bearerToken generated bearerToken for admin api
 */
export const processAndScheduleCandidate = async (
  record: SQSRecord,
  bearerToken: string,
): Promise<void> => {
  console.log(record.body);
  const parsedMessage: ScheduledCandidates = JSON.parse(record.body);

  const emitter = getEmitter();
  const tracker = getTracker(emitter, config.snowplow.appId);

  // traverse through the parsed candidates array
  for (const candidate of parsedMessage.candidates) {
    try {
      // 1. validate scheduled candidate from Metaflow
      await validateCandidate(candidate);
      // 2. if dev & scheduled surface exists in allowed scheduled surfaces, continue processing
      // TODO: schedule to production
      if (
        config.app.isDev ||
        allowedScheduledSurfaces.includes(
          candidate.scheduled_corpus_item.scheduled_surface_guid as string,
        )
      ) {
        // 3. create & schedule OR only schedule candidate
        await createAndScheduleCorpusItemHelper(
          candidate,
          bearerToken,
          tracker,
        );
      } else {
        console.log(
          `Cannot schedule candidate: ${candidate.scheduled_corpus_candidate_id} for surface ${candidate.scheduled_corpus_item.scheduled_surface_guid}.`,
        );
      }
    } catch (error) {
      console.log(`failed to processes candidate: ${error}`);
      Sentry.addBreadcrumb({ message: 'candidate', data: candidate });
      Sentry.captureException(error);
    }
  }
  // Ensure all Snowplow events are emitted before the Lambda exists.
  emitter.flush();
  // Flush processes the HTTP request in the background, so we need to wait here.
  await new Promise((resolve) => setTimeout(resolve, 10000));
};
