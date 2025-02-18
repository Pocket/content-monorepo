import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  ScheduledSurfacesEnum,
  Topics,
} from 'content-common';

export interface SqsSectionWithSectionItems {
  active: boolean;
  candidates: SqsSectionItem[];
  id: string;
  scheduled_surface_guid: ScheduledSurfacesEnum;
  sort: number;
  source: CorpusItemSource.ML;
  title: string;
}

export interface SqsSectionItem {
  authors?: string[];
  excerpt?: string;
  image_url?: string;
  language?: CorpusLanguage;
  rank: number;
  source: CorpusItemSource.ML;
  status: CuratedStatus;
  title?: string;
  topic: Topics;
  url: string;
}

export type CreateOrUpdateSectionApiInput = {
  active: boolean;
  createSource: CorpusItemSource;
  externalId: string;
  scheduledSurfaceGuid: string;
  sort?: number;
  title: string;
};

export type CreateSectionItemApiInput = {
  approvedItemExternalId: string;
  sectionExternalId: string;
  rank?: number;
};
