import { ExcludedDomain, PrismaClient } from '.prisma/client';

// data required to create an excluded domain
export type CreateExcludedDomainHelperInput = {
  domainName: string;
};

/**
 * A helper function that creates a sample curated item for testing or local development.
 * @param prisma
 * @param data
 */
export async function createExcludedDomainHelper(
  prisma: PrismaClient,
  data: CreateExcludedDomainHelperInput,
): Promise<ExcludedDomain> {
  return prisma.excludedDomain.create({ data });
}
