import * as Sentry from '@sentry/serverless';
import { Tracker } from '@snowplow/node-tracker';
import { SQSRecord } from 'aws-lambda';
import { assert, TypeGuardError } from 'typia';

import {
  ActivitySource,
  ApprovedItemAuthor,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  CreateScheduledItemInput,
  CuratedCorpusApiErrorCodes,
  formatQuotesDashesDE,
  formatQuotesEN,
  getEmitter,
  getTracker,
  UrlMetadata,
} from 'content-common';
import {
  generateGraphQlApiHeaders,
  GraphQlApiCallHeaders,
  mapAuthorToApprovedItemAuthor,
  validateDatePublished,
  validateImageUrl,
} from 'lambda-common';

import config from './config';
import {
  generateSnowplowErrorEntity,
  generateSnowplowSuccessEntity,
  queueSnowplowEvent,
} from './events/snowplow';
import { SnowplowScheduledCorpusCandidateErrorName } from './events/types';
import {
  createApprovedAndScheduledCorpusItem,
  createScheduledCorpusItem,
  getApprovedCorpusItemByUrl,
  getUrlMetadata,
} from './graphQlApiCalls';
import {
  allowedScheduledSurfaces,
  ScheduledCandidate,
  ScheduledCandidates,
} from './types';
import { validateCandidate } from './validation';

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
 * @param e Error raised by Typia assert<CreateApprovedCorpusItemApiInput>
 * @param candidate
 */
function handleApprovedItemInputTypiaError(
  e: TypeGuardError,
  candidate: ScheduledCandidate,
) {
  const snowplowError = mapApprovedItemInputTypiaErrorToSnowplowError(e);
  if (snowplowError) {
    const emitter = getEmitter((error: object) => {
      Sentry.addBreadcrumb({ message: 'Emitter Data', data: error });
      Sentry.captureMessage(`Emitter Error`);
    });
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
 * @return CreateApprovedCorpusItemApiInput
 */
export const mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput =
  async (
    candidate: ScheduledCandidate,
    itemMetadata: UrlMetadata,
  ): Promise<CreateApprovedCorpusItemApiInput> => {
    try {
      // source and topic are required from ML & have been validated upstream
      const source = candidate.scheduled_corpus_item.source;
      const topic = candidate.scheduled_corpus_item.topic;

      // for language, title, and excerpt, we prefer ML-supplied values, but
      // will fall back to Parser-supplied values if ML values are missing
      let language: string | undefined =
        candidate.scheduled_corpus_item.language || itemMetadata.language;

      // the Parser returns a lowercase language value
      language = language && language.toUpperCase();

      let title: string | undefined =
        candidate.scheduled_corpus_item.title || itemMetadata.title;

      let excerpt: string | undefined =
        candidate.scheduled_corpus_item.excerpt || itemMetadata.excerpt;

      // title and excerpt have different formatting for different languages
      if (language === CorpusLanguage.EN) {
        // only apply formatting if title and excerpt are defined
        title = title && formatQuotesEN(title);
        excerpt = excerpt && formatQuotesEN(excerpt);
      } else if (language === CorpusLanguage.DE) {
        title = title && formatQuotesDashesDE(title);
        excerpt = excerpt && formatQuotesDashesDE(excerpt);
      }

      let imageUrl: string | undefined =
        candidate.scheduled_corpus_item.image_url || itemMetadata.imageUrl;

      // only validate the imageUrl if it's defined
      imageUrl = imageUrl && (await validateImageUrl(imageUrl));

      // the following fields are from primary source = Parser
      const publisher = itemMetadata.publisher;

      const datePublished = validateDatePublished(itemMetadata.datePublished);

      // Metaflow only grabs the first author even if there are more than 1 author present, so grab authors from Parser
      // if Parser cannot return authors, default to Metaflow then
      let authors: ApprovedItemAuthor[] | undefined;

      if (itemMetadata.authors) {
        authors = mapAuthorToApprovedItemAuthor(
          itemMetadata.authors.split(','),
        );
      } else if (candidate.scheduled_corpus_item.authors) {
        authors = mapAuthorToApprovedItemAuthor(
          candidate.scheduled_corpus_item.authors,
        );
      }

      // set this to any type for now - we validate the type below
      const itemToSchedule: any = {
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
        scheduledSource: source,
        // true will stay true, false or undefined will be false
        isCollection: itemMetadata.isCollection || false, // source = Parser
        isSyndicated: itemMetadata.isSyndicated || false, // source = Parser
        isTimeSensitive: false,
        scheduledDate: candidate.scheduled_corpus_item.scheduled_date, // source = Metaflow
        scheduledSurfaceGuid:
          candidate.scheduled_corpus_item.scheduled_surface_guid, // source = Metaflow
      };

      // Only add the publication date to the mutation input if the date is available
      if (datePublished) {
        itemToSchedule.datePublished = datePublished;
      }

      // assert itemToSchedule against CreateApprovedCorpusItemApiInput before sending to mutation
      assert<CreateApprovedCorpusItemApiInput>(itemToSchedule);

      console.log('item to schedule: ', itemToSchedule);
      return itemToSchedule;
    } catch (e) {
      if (e instanceof TypeGuardError) {
        handleApprovedItemInputTypiaError(e, candidate);
      }

      throw new Error(
        `failed to map ${candidate.scheduled_corpus_candidate_id} to CreateApprovedCorpusItemApiInput. Reason: ${e}`,
      );
    }
  };

/**
 * Creates CreateScheduledItemInput to schedule an approved corpus item
 * @param candidate ScheduledCandidate received from Metaflow
 * @param approvedItemExternalId external id for an already approved corpus item
 * @return CreateScheduledItemInput
 */
export const createCreateScheduledItemInput = (
  candidate: ScheduledCandidate,
  approvedItemExternalId: string,
): CreateScheduledItemInput => {
  try {
    const itemToSchedule: CreateScheduledItemInput = {
      approvedItemExternalId: approvedItemExternalId,
      scheduledSurfaceGuid:
        candidate.scheduled_corpus_item.scheduled_surface_guid,
      scheduledDate: candidate.scheduled_corpus_item.scheduled_date,
      source: candidate.scheduled_corpus_item
        .source as unknown as ActivitySource,
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
): Promise<void> => {
  let approvedCorpusItemId, scheduledItemId;

  const graphHeaders: GraphQlApiCallHeaders = generateGraphQlApiHeaders(
    config.app.name,
    config.app.version,
    bearerToken,
  );

  // 1. query getApprovedCorpusItemByUrl to check if item is already created & approved
  const approvedCorpusItem = await getApprovedCorpusItemByUrl(
    config.AdminApi,
    graphHeaders,
    candidate.scheduled_corpus_item.url,
  );

  // if getApprovedCorpusItemByUrl mutation returns null, this is a new candidate
  // create, approve & schedule it
  if (!approvedCorpusItem) {
    // 2. get metadata from Parser (used to fill in some data fields not provided by Metaflow)
    const parserMetadata = await getUrlMetadata(
      config.AdminApi,
      graphHeaders,
      candidate.scheduled_corpus_item.url,
    );

    // 3. map Metaflow input to CreateApprovedCorpusItemApiInput
    const createApprovedCorpusItemApiInput =
      await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
        candidate,
        parserMetadata,
      );

    // 4. call createApprovedCorpusItem mutation
    const approvedCorpusItemWithScheduleHistory =
      await createApprovedAndScheduledCorpusItem(
        config.AdminApi,
        graphHeaders,
        createApprovedCorpusItemApiInput,
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
    const createScheduledItemInput = createCreateScheduledItemInput(
      candidate,
      approvedCorpusItem.externalId,
    );

    try {
      // 6.  call createScheduledItemInput mutation
      const scheduledItem = await createScheduledCorpusItem(
        config.AdminApi,
        graphHeaders,
        createScheduledItemInput,
      );

      // Set the approved and scheduled ids needed for Snowplow.
      approvedCorpusItemId = approvedCorpusItem.externalId;
      scheduledItemId = scheduledItem.externalId;
    } catch (e) {
      if (
        e instanceof Error &&
        e.message?.indexOf(CuratedCorpusApiErrorCodes.ALREADY_SCHEDULED) >= 0
      ) {
        // Send a Snowplow event indicating that the candidate was already scheduled.
        queueSnowplowEvent(
          tracker,
          generateSnowplowErrorEntity(
            candidate,
            SnowplowScheduledCorpusCandidateErrorName.ALREADY_SCHEDULED,
            e.message,
          ),
        );
        return;
      } else {
        // Unexpected exception
        throw e;
      }
    }
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

  const emitter = getEmitter((error: object) => {
    Sentry.addBreadcrumb({ message: 'Emitter Data', data: error });
    Sentry.captureMessage(`Emitter Error`);
  });
  const tracker = getTracker(emitter, config.snowplow.appId);

  // traverse through the parsed candidates array
  for (const candidate of parsedMessage.candidates) {
    try {
      // 1. validate scheduled candidate from Metaflow
      validateCandidate(candidate);

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

  // Ensure all Snowplow events are emitted before the Lambda exits.
  emitter.flush();

  // Flush processes the HTTP request in the background, so we need to wait here.
  await new Promise((resolve) =>
    setTimeout(resolve, config.snowplow.emitterDelay),
  );
};
