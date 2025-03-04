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
  authors: string[] | null;
  excerpt: string | null;
  image_url: string | null;
  language: CorpusLanguage | null;
  rank: number;
  source: CorpusItemSource.ML;
  status: CuratedStatus;
  title: string | null;
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
