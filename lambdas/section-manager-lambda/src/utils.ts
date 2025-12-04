import { assert } from 'typia';
import * as Sentry from '@sentry/serverless';

import {
  ApprovedItemAuthor,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  formatQuotesEN,
  formatQuotesDashesDE,
  CorpusItemSource,
  SectionItemRemovalReason,
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
  createApprovedCorpusItem,
  createOrUpdateSection,
  createSectionItem,
  getApprovedCorpusItemByUrl,
  removeSectionItem,
} from './graphQlApiCalls';
import {
  ActiveSectionItem,
  CreateOrUpdateSectionApiInput,
  SqsSectionItem,
  SqsSectionWithSectionItems,
} from './types';

/**
 * orchestration function - calls functions to:
 *  - create or update a section
 *  - retrieve or create approved corpus items
 *  - create sections items
 *
 * @param sqsSectionData SqsSectionWithSectionItems object
 * @param jwtBearerToken string
 * @returns Promise<void>
 */
export const processSqsSectionData = async (
  sqsSectionData: SqsSectionWithSectionItems,
  jwtBearerToken: string,
): Promise<void> => {
  const graphHeaders: GraphQlApiCallHeaders = generateGraphQlApiHeaders(
    config.app.name,
    config.app.version,
    jwtBearerToken,
  );

  // create input as required by API to create or update a Section
  const createOrUpdateSectionApiInput: CreateOrUpdateSectionApiInput =
    mapSqsSectionDataToCreateOrUpdateSectionApiInput(sqsSectionData);

  // create or update the Section
  const sectionResult = await createOrUpdateSection(
    graphHeaders,
    createOrUpdateSectionApiInput,
  );

  const sectionExternalId = sectionResult.externalId;
  const activeSectionItems = sectionResult.sectionItems || [];
  // Get SectionItems URLs from existing active SectionItems
  const activeSectionItemsUrlsSet = new Set(
    activeSectionItems.map((item) => item.approvedItem.url),
  );

  // keep track of how many candidates succeeded, how many failed
  let successfulCandidates = 0;
  let failedCandidates = 0;

  // Get the existing SectionItems to remove from a Section
  const sectionItemsToRemove = computeSectionItemsToRemove(
    sqsSectionData,
    activeSectionItems,
  );

  // for each SectionItem, see if the URL already exists in the corpus
  for (let i = 0; i < sqsSectionData.candidates.length; i++) {
    // convenience!
    const sqsSectionItem: SqsSectionItem = sqsSectionData.candidates[i];
    try {
      let approvedItemExternalId: string;
      // avoid creating SectionItem duplicates if the URL already exists
      if (activeSectionItemsUrlsSet.has(sqsSectionItem.url)) {
        continue;
      }
      // see if the Corpus has an ApprovedItem matching the SectionItem's URL
      const approvedCorpusItem = await getApprovedCorpusItemByUrl(
        config.adminApiEndpoint,
        graphHeaders,
        sqsSectionItem.url,
      );

      // if an ApprovedItem with the given URL already exists in the corpus,
      // grab its external id.
      if (approvedCorpusItem) {
        approvedItemExternalId = approvedCorpusItem.externalId;
      } else {
        // if an ApprovedItem wasn't found based on the URL, create one
        const apiInput = await mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
        );

        // create the ApprovedItem
        approvedItemExternalId = await createApprovedCorpusItem(
          config.adminApiEndpoint,
          graphHeaders,
          apiInput,
        );
      }

      // call the mutation to createSectionItem using the ApprovedItem either
      // created or retrieved above
      await createSectionItem(config.adminApiEndpoint, graphHeaders, {
        approvedItemExternalId,
        sectionExternalId,
        rank: sqsSectionItem.rank,
      });
      // Mark URL as active to prevent duplicate creation
      // ML should not be sending duplicate candidate URLs within a Section within the same run
      // this is a safe guard
      activeSectionItemsUrlsSet.add(sqsSectionItem.url);
      // update successful candidates count
      successfulCandidates++;
    } catch (e) {
      // update failed candidates count
      failedCandidates++;
      const message = `Failed to process SectionItem candidate for URL ${sqsSectionItem.url}: `;
      console.error(message, e);
      Sentry.addBreadcrumb({ message });
      Sentry.captureException(e);
      // continue to next item
    }
  }
  // Remove "old" SectionItems not present in ML payload AFTER new ones are created
  if (sectionItemsToRemove.length > 0) {
    for (const item of sectionItemsToRemove) {
      try {
        await removeSectionItem(config.adminApiEndpoint, graphHeaders, {
          externalId: item.externalId,
          deactivateReasons: [SectionItemRemovalReason.ML],
          deactivateSource: CorpusItemSource.ML,
        });
      } catch (e) {
        console.error(`Failed to remove SectionItem ${item.externalId}`, e);
        Sentry.captureException(e);
      }
    }
  } else {
    console.log(`No SectionItems to remove for Section ${sectionExternalId}`);
  }

  console.log(
    `processSqsSectionData result: ${successfulCandidates} succeeded, ${failedCandidates} failed`,
  );
};

/**
 * helper function to compute the diff between currently active SectionItems & SectionItems in ML payload.
 *
 * @param sqsSectionData
 * @param currentActiveSectionItems
 */
export const computeSectionItemsToRemove = (
  sqsSectionData: SqsSectionWithSectionItems,
  currentActiveSectionItems: ActiveSectionItem[],
): ActiveSectionItem[] => {
  // Get SectionItems URLs from ML SectionItem payload
  const mlSectionItemUrls = sqsSectionData.candidates.map((item) => item.url);

  // Get the SectionItems to remove -- existing active SectionItems whose URL is not in the ML SectionItem payload
  const sectionItemsToRemove = currentActiveSectionItems.filter(
    (item) => !mlSectionItemUrls.includes(item.approvedItem.url),
  );
  return sectionItemsToRemove;
};

/**
 * helper function to map section data from SQS to the API input required to
 * call createOrUpdateSection
 *
 * @param sqsSectionData
 * @returns CreateOrUpdateSectionApiInput
 */
export const mapSqsSectionDataToCreateOrUpdateSectionApiInput = (
  sqsSectionData: SqsSectionWithSectionItems,
): CreateOrUpdateSectionApiInput => {
  return {
    active: sqsSectionData.active,
    createSource: sqsSectionData.source,
    externalId: sqsSectionData.id,
    scheduledSurfaceGuid: sqsSectionData.scheduled_surface_guid,
    iab: sqsSectionData.iab,
    sort: sqsSectionData.sort,
    title: sqsSectionData.title,
    description: sqsSectionData.description,
  };
};

/**
 * helper function to map section item data from SQS to the API input required
 * to call createApprovedCorpusItem
 *
 * @param sqsSectionItem SqsSectionItem
 * @returns CreateApprovedCorpusItemApiInput
 */
export const mapSqsSectionItemToCreateApprovedItemApiInput = async (
  sqsSectionItem: SqsSectionItem,
): Promise<CreateApprovedCorpusItemApiInput> => {
  // source and topic are required from ML & have been validated upstream
  const source = sqsSectionItem.source;
  const topic = sqsSectionItem.topic;

  // language from ML, normalized to uppercase
  let language: string | undefined = sqsSectionItem.language ?? undefined;
  language = language && language.toUpperCase();

  // title and excerpt have different formatting for different languages
  let title: string | undefined = sqsSectionItem.title ?? undefined;
  let excerpt: string | undefined = sqsSectionItem.excerpt ?? undefined;

  if (language === CorpusLanguage.EN) {
    // only apply formatting if title and excerpt are defined
    title = title && formatQuotesEN(title);
    excerpt = excerpt && formatQuotesEN(excerpt);
  } else if (language === CorpusLanguage.DE) {
    title = title && formatQuotesDashesDE(title);
    excerpt = excerpt && formatQuotesDashesDE(excerpt);
  }

  let imageUrl: string | undefined = sqsSectionItem.image_url ?? undefined;
  // only validate the imageUrl if it's defined
  imageUrl = imageUrl && (await validateImageUrl(imageUrl));

  // Validate date_published from ML; drop if invalid
  const datePublished = validateDatePublished(sqsSectionItem.date_published);
  if (sqsSectionItem.date_published && !datePublished) {
    console.error(
      `Invalid date_published "${sqsSectionItem.date_published}" for URL ${sqsSectionItem.url}; dropping field`,
    );
  }

  // Use ML authors, fallback to empty array if not provided
  const authors: ApprovedItemAuthor[] = sqsSectionItem.authors
    ? mapAuthorToApprovedItemAuthor(sqsSectionItem.authors)
    : [];

  const apiInput: any = {
    authors,
    excerpt,
    imageUrl,
    isCollection: false,
    isSyndicated: false,
    isTimeSensitive: false,
    language,
    source,
    status: sqsSectionItem.status,
    title,
    topic,
    url: sqsSectionItem.url,
  };

  // Only add the publication date to the mutation input if the date is available
  if (datePublished) {
    apiInput.datePublished = datePublished;
  }

  assert<CreateApprovedCorpusItemApiInput>(apiInput);

  return apiInput;
};
