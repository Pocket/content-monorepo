import { serverLogger } from '@pocket-tools/ts-logger';

import { Prisma, PrismaClient } from '.prisma/client';

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
  // generated/sent by prisma, uncomment the block below.

  //prisma.$on('query', (e) => {
  //  e.source = 'prisma';
  //  console.log(e);
  //});

  return prisma;
}
