import { ScheduledCandidate, ScheduledCandidates } from './types';
import {
  CorpusItemSource,
  CorpusLanguage,
  CreateApprovedItemInput,
  CuratedStatus,
  ScheduledItemSource,
  Topics,
  UrlMetadata,
} from 'content-common';
import { DateTime } from 'luxon';

const defaultScheduledDate = DateTime.fromObject(
  {},
  {
    zone: 'America/Los_Angeles',
  },
)
  .plus({ days: 2 })
  .toISODate();
export const createScheduledCandidates = (
  candidates: ScheduledCandidate[],
): ScheduledCandidates => {
  return {
    candidates: candidates,
  };
};
export const createScheduledCandidate = (
  title?: string,
  excerpt?: string,
  imageUrl?: string,
  language?: CorpusLanguage,
  authors?: string[],
  url?: string,
  source?: CorpusItemSource.ML,
  scheduledDate?: string,
): ScheduledCandidate => {
  return {
    scheduled_corpus_candidate_id: 'a4b5d99c-4c1b-4d35-bccf-6455c8df07b0',
    scheduled_corpus_item: {
      url:
        url ||
        'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
      status: CuratedStatus.RECOMMENDATION,
      source: source || CorpusItemSource.ML,
      topic: Topics.SELF_IMPROVEMENT,
      scheduled_date: scheduledDate || (defaultScheduledDate as string),
      scheduled_surface_guid: 'NEW_TAB_EN_US',
      title: title,
      excerpt: excerpt,
      language: language,
      image_url: imageUrl,
      authors: authors,
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
export const expectedOutput: CreateApprovedItemInput = {
  url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
  title:
    'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
  excerpt:
    'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
  status: CuratedStatus.RECOMMENDATION,
  language: 'EN',
  publisher: 'POLITICO',
  authors: [{ name: 'Rebecca Jennings', sortOrder: 1 }],
  imageUrl: 'https://fake-image-url.com',
  topic: Topics.SELF_IMPROVEMENT,
  source: CorpusItemSource.ML,
  scheduledSource: ScheduledItemSource.ML,
  isCollection: false,
  isSyndicated: false,
  isTimeSensitive: false,
  scheduledDate: defaultScheduledDate as string,
  scheduledSurfaceGuid: 'NEW_TAB_EN_US',
};

export const parserItem: UrlMetadata = {
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
