import { BaseContext } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../database/client';

export interface IPublicContext extends BaseContext {
  db: PrismaClient;
}

export class PublicContextManager implements IPublicContext {
  constructor(
    private config: {
      db: PrismaClient;
    }
  ) {}

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
