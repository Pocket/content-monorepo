import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CorpusLanguage, ProspectType, Prospect } from 'prospectapi-common';
import { BaseContext } from '@apollo/server';

// Re-export CorpusLanguage, used to be part of this file, but moved to common
export { CorpusLanguage };

// this interface aligns with the graphql input type for getProspects query
export interface GetProspectsFilters {
  filters: { scheduledSurfaceGuid: string; prospectType?: ProspectType };
}

// interface for ranked prospects grouped by a prospect type. key is one of ProspectType
export type SortedRankedProspects = {
  [key: string]: Prospect[];
};

// interface for when we create an auth object for a user in the graphql server context
export interface UserAuth {
  name: string;
  username: string;
  groups: string | string[];
  hasReadOnly: boolean;
  hasCuratorFull: boolean;
  canRead: (scheduledSurfaceGuid: string) => boolean;
  canWrite: (scheduledSurfaceGuid: string) => boolean;
}

// enum to store access groups that align with congnito custom groups
export enum MozillaAccessGroup {
  READONLY = 'team_pocket', // Read only access to all curation tools
  COLLECTION_CURATOR_FULL = 'mozilliansorg_pocket_collection_curator_full', // Access to full collection tool
  SCHEDULED_SURFACE_CURATOR_FULL = 'mozilliansorg_pocket_scheduled_surface_curator_full', // Access to full corpus tool, implies they have access to all scheduled surfaces.
  NEW_TAB_CURATOR_ENUS = 'mozilliansorg_pocket_new_tab_curator_enus', // Access to en-us new tab in the corpus tool.
  NEW_TAB_CURATOR_DEDE = 'mozilliansorg_pocket_new_tab_curator_dede', // Access to de-de new tab in corpus tool.
  NEW_TAB_CURATOR_ENGB = 'mozilliansorg_pocket_new_tab_curator_engb', // Access to en-gb new tab in corpus tool.
  NEW_TAB_CURATOR_ENINTL = 'mozilliansorg_pocket_new_tab_curator_enintl', // Access to en-intl new tab in corpus tool.
  NEW_TAB_CURATOR_ESES = 'mozilliansorg_pocket_new_tab_curator_eses', // Access to es-es new tab in the corpus tool.
  NEW_TAB_CURATOR_FRFR = 'mozilliansorg_pocket_new_tab_curator_frfr', // Access to fr-fr new tab in the corpus tool.
  NEW_TAB_CURATOR_ITIT = 'mozilliansorg_pocket_new_tab_curator_itit', // Access to it-it new tab in the corpus tool.
  POCKET_HITS_CURATOR_ENUS = 'mozilliansorg_pocket_pocket_hits_curator_enus', // Access to en us Pocket Hits in the corpus tool.
  POCKET_HITS_CURATOR_DEDE = 'mozilliansorg_pocket_pocket_hits_curator_dede', // Access to de de Pocket Hits in the corpus tool.
  CURATOR_SANDBOX = 'mozilliansorg_pocket_curator_sandbox', // Access to sandbox test surface in the corpus tool.
}

// enum that maps the scheduled surface guid to a Mozilla access group
export enum ScheduledSurfaceGuidToMozillaAccessGroup {
  NEW_TAB_EN_US = MozillaAccessGroup.NEW_TAB_CURATOR_ENUS,
  NEW_TAB_EN_GB = MozillaAccessGroup.NEW_TAB_CURATOR_ENGB,
  NEW_TAB_EN_INTL = MozillaAccessGroup.NEW_TAB_CURATOR_ENINTL,
  NEW_TAB_DE_DE = MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
  NEW_TAB_ES_ES = MozillaAccessGroup.NEW_TAB_CURATOR_ESES,
  NEW_TAB_FR_FR = MozillaAccessGroup.NEW_TAB_CURATOR_FRFR,
  NEW_TAB_IT_IT = MozillaAccessGroup.NEW_TAB_CURATOR_ITIT,
  POCKET_HITS_EN_US = MozillaAccessGroup.POCKET_HITS_CURATOR_ENUS,
  POCKET_HITS_DE_DE = MozillaAccessGroup.POCKET_HITS_CURATOR_DEDE,
  SANDBOX = MozillaAccessGroup.CURATOR_SANDBOX,
}

export interface AdminAPIUserContext extends BaseContext {
  db: any;
  userAuth: UserAuth;
}

// type for the context object created when instantiating a new server
export class Context implements AdminAPIUserContext {
  db: DynamoDBDocumentClient;
  userAuth: UserAuth;
}
