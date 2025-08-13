import {
  CorpusItemSource,
  CorpusLanguage,
  CuratedStatus,
  IABMetadata,
  ScheduledSurfacesEnum,
  SectionItemRemovalReason,
  Topics,
} from 'content-common';

export interface SqsSectionWithSectionItems {
  active: boolean;
  candidates: SqsSectionItem[];
  id: string;
  scheduled_surface_guid: ScheduledSurfacesEnum;
  iab?: IABMetadata;
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
};

export interface ActiveSectionItem {
  externalId: string;
  approvedItem: {
    externalId: string;
    url: string;
  };
};

export type CreateOrUpdateSectionApiInput = {
  active: boolean;
  createSource: CorpusItemSource;
  externalId: string;
  scheduledSurfaceGuid: string;
  iab?: IABMetadata;
  sort?: number;
  title: string;
};

export type CreateSectionItemApiInput = {
  approvedItemExternalId: string;
  sectionExternalId: string;
  rank?: number;
};

export type RemoveSectionItemApiInput = {
  externalId: string;
  deactivateReasons: SectionItemRemovalReason[];
  deactivateSource: CorpusItemSource;
};