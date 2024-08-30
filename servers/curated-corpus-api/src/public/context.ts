import { BaseContext } from '@apollo/server';
import DataLoader from 'dataloader';

import { PrismaClient } from '.prisma/client';

import { client } from '../database/client';
import { CorpusItem } from '../database/types';
import { createCorpusItemDataLoaders } from '../dataLoaders/corpusItemLoader';

export interface IPublicContext extends BaseContext {
  db: PrismaClient;
  dataLoaders: {
    corpusItemsById: DataLoader<string, CorpusItem>;
    corpusItemsByUrl: DataLoader<string, CorpusItem>;
  };
}

export class PublicContextManager implements IPublicContext {
  public readonly dataLoaders: IPublicContext['dataLoaders'];

  constructor(
    private config: {
      db: PrismaClient;
    },
  ) {
    this.dataLoaders = {
      ...createCorpusItemDataLoaders(this.db),
    };
  }

  get db(): IPublicContext['db'] {
    return this.config.db;
  }
}

/**
 * Context factory. Creates a new request context with
 * apollo compatible interface and default singleton
 * clients.
 * @returns PublicContextManager
 */
export async function getPublicContext(): Promise<PublicContextManager> {
  return new PublicContextManager({
    db: client(),
  });
}
