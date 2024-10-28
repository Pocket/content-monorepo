import { PrismaClient } from '.prisma/client';

/**
 * Checks whether a domain name is on the excluded domains list or not.
 *
 * @param db
 * @param domainName
 */
export async function isExcludedDomain(
  db: PrismaClient,
  domainName: string,
): Promise<boolean> {
  const result = await db.excludedDomain.findUnique({ where: { domainName } });

  return !!result;
}
