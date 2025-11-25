import { PrismaClient } from '.prisma/client';

import { getNormalizedDomainName, getRegistrableDomain } from '../../shared/utils';

/**
 * Looks up a publisher name from the PublisherDomain table.
 *
 * The lookup is performed in two stages:
 * 1. First, try to find an exact match by the full hostname (subdomain).
 * 2. If not found, try to find a match by the registrable domain (eTLD+1).
 *
 * @param db Prisma client
 * @param url The URL to look up the publisher for
 * @returns The publisher name if found, or null if no match exists
 */
export async function lookupPublisher(
  db: PrismaClient,
  url: string,
): Promise<string | null> {
  // Get the full hostname (minus www.)
  const hostname = getNormalizedDomainName(url);

  // First, try to find an exact match by hostname (e.g., "news.example.com")
  const exactMatch = await db.publisherDomain.findUnique({
    where: { domainName: hostname },
  });

  if (exactMatch) {
    return exactMatch.publisher;
  }

  // If no exact match, try to find by registrable domain (e.g., "example.com")
  const registrableDomain = getRegistrableDomain(url);

  // Only look up if the registrable domain is different from the hostname
  // (i.e., the URL has a subdomain)
  if (registrableDomain && registrableDomain !== hostname) {
    const domainMatch = await db.publisherDomain.findUnique({
      where: { domainName: registrableDomain },
    });

    if (domainMatch) {
      return domainMatch.publisher;
    }
  }

  return null;
}
