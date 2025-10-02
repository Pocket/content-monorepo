import { DateTime } from 'luxon';
import { http } from 'msw';
import { SetupServer } from 'msw/node';

import {
  CorpusItemSource,
  CorpusLanguage,
  CreateApprovedCorpusItemApiInput,
  CuratedStatus,
  ActivitySource,
  ScheduledSurfacesEnum,
  Topics,
  UrlMetadata,
} from 'content-common';

import config from './config';
import * as GraphQlApiCalls from './graphQlApiCalls';
import {
  ScheduledCandidate,
  ScheduledCandidates,
  ScheduledCorpusItem,
} from './types';

// Saturday, December 30, 2023 14.00 EST
export const currentMockTimeMondaySaturday = DateTime.fromObject(
  {
    year: 2023,
    month: 12,
    day: 30,
    hour: 14,
    minute: 0,
    second: 0,
  },
  { zone: config.validation.EN_US.timeZone },
);

// Sunday, December 31, 2023 20.00 DE
export const currentMockTimeTuesdaySaturday = DateTime.fromObject(
  {
    year: 2023,
    month: 12,
    day: 31,
    hour: 20,
    minute: 0,
    second: 0,
  },
  { zone: config.validation.DE_DE.timeZone },
);

// Sunday, December 31, 2023 3 AM EST
export const scheduledDateSunday = DateTime.fromObject(
  {
    year: 2023,
    month: 12,
    day: 31,
    hour: 3,
    minute: 0,
    second: 0,
  },
  { zone: config.validation.EN_US.timeZone },
);

// Monday, January 1, 2024 9 AM DE
export const scheduledDateMonday = DateTime.fromObject(
  {
    year: 2024,
    month: 1,
    day: 1,
    hour: 9,
    minute: 0,
    second: 0,
  },
  { zone: config.validation.DE_DE.timeZone },
);

export const defaultScheduledDate = DateTime.fromObject(
  {},
  {
    zone: 'America/New_York',
  },
)
  .plus({ days: 3 }) // Needs to be at least +3 days on Friday after 4pm, and +2 days otherwise.
  .toISODate();
export const createScheduledCandidates = (
  candidates: ScheduledCandidate[],
): ScheduledCandidates => {
  return {
    candidates: candidates,
  };
};
export const createScheduledCandidate = (
  scheduledCorpusItemOverrides: Partial<ScheduledCorpusItem> = {},
): ScheduledCandidate => {
  return {
    scheduled_corpus_candidate_id: 'a4b5d99c-4c1b-4d35-bccf-6455c8df07b0',
    scheduled_corpus_item: {
      url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
      status: CuratedStatus.RECOMMENDATION,
      source: CorpusItemSource.ML,
      topic: Topics.SELF_IMPROVEMENT,
      scheduled_date: defaultScheduledDate as string,
      scheduled_surface_guid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      title:
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
      excerpt:
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
      language: CorpusLanguage.EN,
      image_url: 'https://fake-image-url.com',
      authors: ['Rebecca Jennings'],
      ...scheduledCorpusItemOverrides,
    },
    features: {
      domain_prob: 0.7829,
      age_in_days: 0.1,
      data_source: 'prospect',
      day_of_week: 2,
      month: 2,
      open_count: 10.0,
      save_count: 0,
      word_count: 1865.0,
      approval_proba: 0.98,
      emotion_score: 1.5376,
      score: 117.9775,
      rank: 1,
      ml_version: 'v0.6',
    },
    run_details: {
      flow_name: 'ScheduleFlow',
      run_id: '3647',
    },
  };
};

export const getCreateApprovedCorpusItemApiOutput =
  (): CreateApprovedCorpusItemApiInput => {
    return {
      url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
      title: "Romantic norms are in flux. No wonder everyone\u2019s obsessed with polyamory.",
      excerpt:
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
      status: CuratedStatus.RECOMMENDATION,
      language: CorpusLanguage.EN,
      publisher: 'POLITICO',
      authors: [{ name: 'Rebecca Jennings', sortOrder: 1 }],
      imageUrl: 'https://fake-image-url.com',
      topic: Topics.SELF_IMPROVEMENT,
      source: CorpusItemSource.ML,
      scheduledSource: ActivitySource.ML,
      isCollection: false,
      isSyndicated: false,
      isTimeSensitive: false,
      scheduledDate: defaultScheduledDate as string,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    };
  };

export const getParserItem = (): UrlMetadata => {
  return {
    url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
    title:
      'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
    excerpt:
      'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
    language: 'EN',
    publisher: 'POLITICO',
    authors: 'Rebecca Jennings',
    imageUrl: 'https://fake-image-url.com',
    isCollection: false,
    isSyndicated: false,
  };
};

export const getUrlMetadataBody = {
  url: 'https://getUrlMetadataBody-fake-url.com',
  title: 'Fake title',
  excerpt: 'fake excerpt',
  status: CuratedStatus.RECOMMENDATION,
  language: 'EN',
  publisher: 'POLITICO',
  datePublished: '2024-01-01',
  authors: 'Fake Author',
  imageUrl: 'https://fake-image-url.com',
  topic: Topics.SELF_IMPROVEMENT,
  source: CorpusItemSource.ML,
  isCollection: false,
  isSyndicated: false,
};

export const getApprovedCorpusItemByUrlBody = {
  url: 'https://getApprovedCorpusItemByUrlBody-fake-url.com',
  externalId: 'fake-external-id',
};

export const createApprovedCorpusItemBody = {
  externalId: 'fake-external-id',
  url: 'https://createApprovedCorpusItemBody-fake-url.com',
  title: 'Fake title',
  scheduledSurfaceHistory: [
    {
      externalId: '143b8de8-0dc9-4613-b9f0-0e8837a2df1c',
    },
  ],
};

export const createScheduledCorpusItemBody = {
  externalId: 'fake-scheduled-external-id-2',
  approvedItem: {
    externalId: 'fake-external-id',
    url: 'https://createScheduledCorpusItemBody-fake-url.com',
    title: 'Fake title',
  },
};

export const mockGetUrlMetadata = (
  responseBody: any = getUrlMetadataBody,
): void => {
  jest.spyOn(GraphQlApiCalls, 'getUrlMetadata').mockImplementation(async () => {
    return responseBody;
  });
};

export const mockGetApprovedCorpusItemByUrl = (
  responseBody: any = getApprovedCorpusItemByUrlBody,
): void => {
  jest
    .spyOn(GraphQlApiCalls, 'getApprovedCorpusItemByUrl')
    .mockImplementation(async () => {
      return responseBody;
    });
};

export const mockCreateApprovedCorpusItem = (
  body: any = createApprovedCorpusItemBody,
): void => {
  jest
    .spyOn(GraphQlApiCalls, 'createApprovedAndScheduledCorpusItem')
    .mockImplementation(async () => {
      return body;
    });
};

export const mockCreateScheduledCorpusItem = (
  body: any = createScheduledCorpusItemBody,
): void => {
  jest
    .spyOn(GraphQlApiCalls, 'createScheduledCorpusItem')
    .mockImplementation(async () => {
      return body;
    });
};

/**
 * Set up the mock server to mock snowplow endpoint.
 * @param server
 */
export const mockSnowplow = (server: SetupServer) => {
  server.use(
    http.post(
      'http://localhost:9090/com.snowplowanalytics.snowplow/tp2',
      () => {},
    ),
  );
};

/**
 * Mock setTimeout to immediately return.
 *
 * Surprisingly, jest.useFakeTimers cannot do this. It requires jest.runAllTimers() to be called
 * _after_ setTimeout() is started. That's not feasible if other promises are returned first,
 * for example when using `for await`, or when awaiting another async function.
 */
export const mockSetTimeoutToReturnImmediately = () => {
  jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
    callback();
    return {} as NodeJS.Timeout;
  });
};
