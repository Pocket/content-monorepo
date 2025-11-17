import { CorpusItemSource, CuratedStatus, Topics } from 'content-common';

import * as GraphQlApiCalls from './graphQlApiCalls';

export const getUrlMetadataBody = {
  authors: 'Fake Author',
  datePublished: '2024-01-01',
  domain: 'fake-image-url.com',
  excerpt: 'fake excerpt',
  imageUrl: 'https://fake-image-url.com',
  isCollection: false,
  isSyndicated: false,
  language: 'EN',
  publisher: 'POLITICO',
  source: CorpusItemSource.ML,
  status: CuratedStatus.RECOMMENDATION,
  title: 'Fake title',
  topic: Topics.SELF_IMPROVEMENT,
  url: 'https://getUrlMetadataBody-fake-url.com',
};

export const mockGetUrlMetadata = (
  responseBody: any = getUrlMetadataBody,
): void => {
  jest.spyOn(GraphQlApiCalls, 'getUrlMetadata').mockImplementation(async () => {
    return responseBody;
  });
};
