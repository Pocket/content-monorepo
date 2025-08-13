import { assert } from 'typia';
import * as Sentry from '@sentry/serverless';

import {
  applyApTitleCase,
  ApprovedItemAuthor,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  formatQuotesEN,
  formatQuotesDashesDE,
  UrlMetadata,
  CorpusItemSource,
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
  getUrlMetadata,
  removeSectionItem,
} from './graphQlApiCalls';
import {
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

  const sectionExternalId =  sectionResult.externalId;
  const activeSectionItems = sectionResult.sectionItems || [];

  // keep track of how many candidates succeeded, how many failed
  let successfulCandidates = 0;
  let failedCandidates = 0;

  // Get SectionItems URLs from ML SectionItem payload
  const mlSectionItemUrls = sqsSectionData.candidates.map(item => item.url);
  // Get SectionItems URLs from existing active SectionItems
  const activeSectionItemsUrlsSet = new Set(activeSectionItems.map((item) => item.approvedItem.url));

  // Get the SectionItems to remove -- existing active SectionItems whose URL is not in the ML SectionItem payload
  const sectionItemsToRemove = activeSectionItems.filter(
    (item) => !mlSectionItemUrls.includes(item.approvedItem.url),
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

        // retrieve URL metadata from the Parser. this fills in some metadata ML
        // doesn't send, and acts as a backup if optional ML data points are not
        // available.
        const parserMetadata = await getUrlMetadata(
          config.adminApiEndpoint,
          graphHeaders,
          sqsSectionItem.url,
        );

        // create input for the createApprovedItem mutation, favoring metadata
        // from ML (in most cases)
        const apiInput = await mapSqsSectionItemToCreateApprovedItemApiInput(
          sqsSectionItem,
          parserMetadata,
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
      // update successful candidates count
      // Mark URL as active to prevent duplicate creation
      activeSectionItemsUrlsSet.add(sqsSectionItem.url);
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

  console.log(`processSqsSectionData result: ${successfulCandidates} succeeded, ${failedCandidates} failed`);
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
  };
};

/**
 * helper function to map section item data from SQS to the API input required
 * to call createApprovedCorpusItem
 *
 * @param sqsSectionItem SqsSectionItem
 * @param parserMetadata UrlMetadata
 * @returns
 */
export const mapSqsSectionItemToCreateApprovedItemApiInput = async (
  sqsSectionItem: SqsSectionItem,
  parserMetadata: UrlMetadata,
): Promise<CreateApprovedCorpusItemApiInput> => {
  // source and topic are required from ML & have been validated upstream
  const source = sqsSectionItem.source;
  const topic = sqsSectionItem.topic;

  // for language, title, and excerpt, we prefer ML-supplied values, but
  // will fall back to Parser-supplied values if ML values are missing
  let language: string | undefined =
    sqsSectionItem.language || parserMetadata.language;

  // the Parser returns a lowercase language value
  language = language && language.toUpperCase();

  // title and excerpt have different formatting for different languages
  let title: string | undefined = sqsSectionItem.title || parserMetadata.title;

  let excerpt: string | undefined =
    sqsSectionItem.excerpt || parserMetadata.excerpt;

  if (language === CorpusLanguage.EN) {
    // only apply formatting if title and excerpt are defined
    title = title && formatQuotesEN(applyApTitleCase(title));
    excerpt = excerpt && formatQuotesEN(excerpt);
  } else if (language === CorpusLanguage.DE) {
    title = title && formatQuotesDashesDE(title);
    excerpt = excerpt && formatQuotesDashesDE(excerpt);
  }

  let imageUrl: string | undefined =
    sqsSectionItem.image_url || parserMetadata.imageUrl;

  // only validate the imageUrl if it's defined
  imageUrl = imageUrl && (await validateImageUrl(imageUrl));

  // the following fields are from primary source = Parser
  const publisher = parserMetadata.publisher;

  const datePublished = validateDatePublished(parserMetadata.datePublished);

  // Metaflow only grabs the first author even if there are more than 1 author present, so grab authors from Parser
  // if Parser cannot return authors, default to Metaflow then
  let authors: ApprovedItemAuthor[] | undefined;

  if (parserMetadata.authors) {
    authors = mapAuthorToApprovedItemAuthor(parserMetadata.authors.split(','));
  } else if (sqsSectionItem.authors) {
    authors = mapAuthorToApprovedItemAuthor(sqsSectionItem.authors);
  }

  const apiInput: any = {
    authors,
    excerpt,
    imageUrl,
    isCollection: parserMetadata.isCollection || false,
    isSyndicated: parserMetadata.isSyndicated || false,
    isTimeSensitive: false,
    language,
    publisher,
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
