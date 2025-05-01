import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  IABMetadata,
  ScheduledSurfacesEnum,
  Topics,
} from 'content-common';

import { SqsSectionItem, SqsSectionWithSectionItems } from './types';

export const createSqsSectionWithSectionItems = (
  sqsSectionWithSectionItemsOverride: Partial<SqsSectionWithSectionItems> = {},
  candidateCount: number = 2,
): SqsSectionWithSectionItems => {
  const iabMetadata: IABMetadata = {
    taxonomy: "IAB-3.0",
    categories: ["488"]
  };

  const candidates: SqsSectionItem[] = [];

  for (let i = 0; i < candidateCount; i++) {
    candidates.push(
      createSqsSectionItem({ rank: i, title: `Test candidate ${i}` }),
    );
  }

  return {
    active: true,
    candidates,
    id: 'a4b5d99c-4c1b-4d35-bccf-6455c8df07b1',
    scheduled_surface_guid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
    iab: iabMetadata,
    sort: 1,
    source: CorpusItemSource.ML,
    title: 'The Reindeer Section',
    ...sqsSectionWithSectionItemsOverride,
  };
};

export const createSqsSectionItem = (
  sqsSectionItemOverride: Partial<SqsSectionItem> = {},
): SqsSectionItem => {
  return {
    authors: ['Rebecca Jennings'],
    excerpt:
      'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
    image_url: 'https://fake-image-url.com',
    language: CorpusLanguage.EN,
    rank: 1,
    source: CorpusItemSource.ML,
    status: CuratedStatus.RECOMMENDATION,
    title:
      'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
    topic: Topics.SELF_IMPROVEMENT,
    url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
    ...sqsSectionItemOverride,
  };
};
