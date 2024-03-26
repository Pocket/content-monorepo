import { PrismaClient } from '.prisma/client';

/**
 * A helper method that wipes all data from the database.
 * Useful for resetting the DB between integration tests.
 *
 * @param prisma
 */
export async function clearDb(prisma: PrismaClient): Promise<void> {
  // Delete data from each table, starting with tables that contain foreign keys
  await prisma.scheduledItem.deleteMany({});
  await prisma.approvedItem.deleteMany({});
  await prisma.rejectedCuratedCorpusItem.deleteMany({});
}
