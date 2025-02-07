import { assert } from 'typia';

import {
  applyApTitleCase,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  formatQuotesEN,
  formatQuotesDashesDE,
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
import { createOrUpdateSection } from './graphQlApiCalls';
import {
  CreateOrUpdateSectionApiInput,
  SqsSectionItem,
  SqsSectionWithSectionItems,
} from './types';

export const mapSqsSectionItemToCreateApprovedItemApiInput = async (
  sqsSectionItem: SqsSectionItem,
  itemMetadata: UrlMetadata,
): Promise<CreateApprovedCorpusItemApiInput> => {
  try {
    // source and topic are required from ML & have been validated upstream
    const source = sqsSectionItem.source;
    const topic = sqsSectionItem.topic;

    // for language, title, and excerpt, we prefer ML-supplied values, but
    // will fall back to Parser-supplied values if ML values are missing
    let language: string | undefined =
      sqsSectionItem.language || itemMetadata.language;

    // title and excerpt have different formatting for different languages
    let title: string | undefined = sqsSectionItem.title || itemMetadata.title;

    let excerpt: string | undefined =
      sqsSectionItem.excerpt || itemMetadata.excerpt;

    if (language === CorpusLanguage.EN) {
      // only apply formatting if title and excerpt are defined
      title = title && formatQuotesEN(applyApTitleCase(title));
      excerpt = excerpt && formatQuotesEN(excerpt);
    } else if (language === CorpusLanguage.DE) {
      title = title && formatQuotesDashesDE(title);
      excerpt = excerpt && formatQuotesDashesDE(excerpt);
    }

    let imageUrl: string | undefined =
      sqsSectionItem.image_url || itemMetadata.imageUrl;

    // only validate the imageUrl if it's defined
    imageUrl = imageUrl && (await validateImageUrl(imageUrl));

    // the following fields are from primary source = Parser
    const publisher = itemMetadata.publisher;

    const datePublished = validateDatePublished(itemMetadata.datePublished);

    // Metaflow only grabs the first author even if there are more than 1 author present, so grab authors from Parser
    // if Parser cannot return authors, default to Metaflow then

    /* eslint-disable */
    const authors = itemMetadata.authors
      ? mapAuthorToApprovedItemAuthor(itemMetadata.authors!.split(','))
      : mapAuthorToApprovedItemAuthor(sqsSectionItem.authors!);
    /* eslint-enable */

    const apiInput: any = {
      authors,
      excerpt,
      imageUrl,
      isCollection: itemMetadata.isCollection || false,
      isSyndicated: itemMetadata.isSyndicated || false,
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
  } catch (e) {
    // TODO: send error to Sentry
    throw new Error(
      `failed to map ${sqsSectionItem.url} to CreateApprovedCorpusItemApiInput. Reason: ${e}`,
    );
  }
};

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
    mapSqsSectionDataToApiInput(sqsSectionData);

  // create or update the Section
  await createOrUpdateSection(graphHeaders, createOrUpdateSectionApiInput);

  /*
  WIP below - will complete in MC-1645
  // for each SectionItem, see if the URL already exists in the corpus
  for (let i = 0; i < sqsSectionData.candidates.length; i++) {
    // convenience!
    const sqsSectionItem: SqsSectionItem = sqsSectionData.candidates[i];

    // see if the Corpus has an ApprovedItem matching the SectionItem's URL
    const approvedCorpusItem = await getApprovedCorpusItemByUrl(
      config.adminApiEndpoint,
      graphHeaders,
      sqsSectionItem.url,
    );

    // if an ApprovedItem wasn't found based on the URL, create one
    if (!approvedCorpusItem) {
      // retrieve URL metadata from the Parser
      const parserMetadata = await getUrlMetadata(
        config.adminApiEndpoint,
        graphHeaders,
        sqsSectionItem.url,
      );

      // create input for the createApprovedItem mutation, favoring metadata
      // from the parser (for now?)
      const apiInput = mapSqsSectionItemToCreateApprovedItemApiInput(
        sqsSectionItem,
        parserMetadata,
      );

      // create the ApprovedItem
    }

    // call the mutation to createSectionItem using the ApprovedItem either
    // created or retrieved above
  }
  */
};

/**
 * helper function to map section data from SQS to the API input required to
 * call createOrUpdateSection
 *
 * @param sqsSectionData
 * @returns CreateOrUpdateSectionApiInput
 */
export const mapSqsSectionDataToApiInput = (
  sqsSectionData: SqsSectionWithSectionItems,
): CreateOrUpdateSectionApiInput => {
  return {
    active: sqsSectionData.active,
    createSource: sqsSectionData.source,
    externalId: sqsSectionData.id,
    scheduledSurfaceGuid: sqsSectionData.scheduled_surface_guid,
    sort: sqsSectionData.sort,
    title: sqsSectionData.title,
  };
};
