import { PrismaClient, PublisherDomain } from '.prisma/client';

import {
  getNormalizedDomainFromUrl,
  getRegistrableDomainFromUrl,
} from '../../shared/utils';

/**
 * Input type for createOrUpdatePublisherDomain mutation.
 */
export interface CreateOrUpdatePublisherDomainInput {
  domainName: string; // Already sanitized and validated
  publisher: string;
}

/**
 * Creates or updates a publisher name mapping for a domain.
 *
 * Uses Prisma upsert to either create a new record or update an existing one.
 *
 * @param db Prisma client
 * @param data Input containing sanitized domainName and publisher name
 * @param username The authenticated user performing the action
 * @returns The created or updated PublisherDomain record
 */
export async function createOrUpdatePublisherDomain(
  db: PrismaClient,
  data: CreateOrUpdatePublisherDomainInput,
  username: string,
): Promise<PublisherDomain> {
  const { domainName, publisher } = data;
  const trimmedPublisher = publisher.trim();

  return db.publisherDomain.upsert({
    where: { domainName },
    update: {
      publisher: trimmedPublisher,
      updatedBy: username,
    },
    create: {
      domainName,
      publisher: trimmedPublisher,
      createdBy: username,
    },
  });
}

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
  const hostname = getNormalizedDomainFromUrl(url);

  // First, try to find an exact match by hostname (e.g., "news.example.com")
  const exactMatch = await db.publisherDomain.findUnique({
    where: { domainName: hostname },
  });

  if (exactMatch) {
    return exactMatch.publisher;
  }

  // If no exact match, try to find by registrable domain (e.g., "example.com")
  const registrableDomain = getRegistrableDomainFromUrl(url);

  // Only look up if the registrable domain is different from the hostname
  // (i.e., the URL has a subdomain)
  if (registrableDomain !== hostname) {
    const domainMatch = await db.publisherDomain.findUnique({
      where: { domainName: registrableDomain },
    });

    if (domainMatch) {
      return domainMatch.publisher;
    }
  }

  return null;
}
