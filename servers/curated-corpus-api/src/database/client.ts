import { serverLogger } from '@pocket-tools/ts-logger';

import { Prisma, PrismaClient } from '.prisma/client';
import config from '../config';

let prisma;

export function client(): PrismaClient {
  if (prisma) return prisma;

  // This is the level of logging we expect on Production
  const log: Array<Prisma.LogDefinition> = [
    {
      level: 'error',
      emit: 'event',
    },
    {
      level: 'warn',
      emit: 'event',
    },
    {
      level: 'info',
      emit: 'event',
    },
  ];

  // For non-prod environments, log all queries, too.
  if (config.app.environment !== 'production') {
    log.push({ level: 'query', emit: 'event' });
  }

  prisma = new PrismaClient({
    log,
  });

  prisma.$on('error', (e) => {
    e.source = 'prisma';
    serverLogger.error(e);
  });

  prisma.$on('warn', (e) => {
    e.source = 'prisma';
    serverLogger.warn(e);
  });

  prisma.$on('info', (e) => {
    e.source = 'prisma';
    serverLogger.info(e);
  });

  // Allow logger to subscribe to query events from Prisma
  // in non-production environments only.
  if (config.app.environment !== 'production') {
    prisma.$on('query', (e) => {
      e.source = 'prisma';
      serverLogger.debug(e);
      // local development - for easy viewing of the actual SQL being
      // generated/sent by prisma, uncomment the console.log statement below.
      //console.log(e);
    });
  }

  return prisma;
}
