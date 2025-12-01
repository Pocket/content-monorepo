import { PublisherDomain, PrismaClient } from '.prisma/client';

// data required to create a publisher domain
export type CreatePublisherDomainHelperInput = {
  domainName: string;
  publisher: string;
  createdBy?: string;
};

/**
 * A helper function that creates a sample publisher domain for testing.
 * @param prisma
 * @param data
 */
export async function createPublisherDomainHelper(
  prisma: PrismaClient,
  data: CreatePublisherDomainHelperInput,
): Promise<PublisherDomain> {
  return prisma.publisherDomain.create({
    data: {
      domainName: data.domainName,
      publisher: data.publisher,
      createdBy: data.createdBy ?? 'test-user',
    },
  });
}
