import { serverLogger } from '@pocket-tools/ts-logger';

import { Prisma, PrismaClient } from '.prisma/client';

import { collectionStoryInjectItemMiddleware } from '../middleware/prisma';

let prisma;

export function client(): PrismaClient {
  if (prisma) return prisma;

  // This is the level of logging we expect on Production
  const log: Array<Prisma.LogDefinition> = [
    {
      level: 'error',
      emit: 'event',
    },
  ];

  prisma = new PrismaClient({
    log,
  });

  prisma.$on('error', (e) => {
    e.source = 'prisma';
    serverLogger.error(e);
  });

  // local development - for easy viewing of the actual SQL being
  // generated/sent by prisma, uncomment the console.log statement below.

  //prisma.$on('query', (e) => {
  //  e.source = 'prisma';
  //  console.log(e);
  //});

  // this is a middleware function that injects non-database / non-prisma
  // data into each CollectionStory. this extra data is necessary to relate
  // a CollectionStory with a parser Item.
  prisma.$use(collectionStoryInjectItemMiddleware);

  return prisma;
}
