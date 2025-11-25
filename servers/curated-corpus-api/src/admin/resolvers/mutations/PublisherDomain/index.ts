import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { PublisherDomain } from '.prisma/client';

import { createOrUpdatePublisherDomain as dbCreateOrUpdatePublisherDomain } from '../../../../database/mutations';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import {
  sanitizeDomainName,
  validateDomainName,
} from '../../../../shared/utils';
import { IAdminContext } from '../../../context';

/**
 * Creates or updates a publisher domain mapping.
 *
 * This resolver:
 * 1. Checks that the user has corpus write access
 * 2. Validates the raw input isn't a URL (before sanitization mangles it)
 * 3. Sanitizes the domain name (trim, lowercase, punycode, strip www.)
 * 4. Validates the domain name (rejects IPs, public suffixes, wildcards, etc.)
 * 5. Creates or updates the mapping in the database
 *
 * @param parent - GraphQL parent resolver
 * @param data - CreateOrUpdatePublisherDomainInput
 * @param context - Admin context with auth and database access
 * @returns The created or updated PublisherDomain record
 * @throws AuthenticationError - If user lacks corpus write access
 * @throws UserInputError - If domain validation fails
 */
export async function createOrUpdatePublisherDomain(
  parent,
  { data },
  context: IAdminContext,
): Promise<PublisherDomain> {
  // Check if the user can write to the corpus
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Check for URL scheme before sanitization (sanitization would mangle it)
  const trimmedInput = data.domainName.trim();
  if (/^https?:\/\//i.test(trimmedInput)) {
    throw new UserInputError(
      'Domain name must be a hostname, not a full URL. Remove the http(s):// prefix.',
    );
  }

  // Sanitize the domain name
  const sanitizedDomainName = sanitizeDomainName(data.domainName);

  // Validate the domain name (throws UserInputError if invalid)
  validateDomainName(sanitizedDomainName);

  // Create or update the publisher domain mapping
  return dbCreateOrUpdatePublisherDomain(
    context.db,
    {
      domainName: sanitizedDomainName,
      publisher: data.publisher,
    },
    context.authenticatedUser.username,
  );
}
