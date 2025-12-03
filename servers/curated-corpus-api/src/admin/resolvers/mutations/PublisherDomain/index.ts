import { AuthenticationError } from '@pocket-tools/apollo-utils';
import { PublisherDomain } from '.prisma/client';

import { createOrUpdatePublisherDomain as dbCreateOrUpdatePublisherDomain } from '../../../../database/mutations';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import {
  normalizeDomain,
  validateDomainName,
} from '../../../../shared/utils';
import { IAdminContext } from '../../../context';

/**
 * Creates or updates a publisher domain mapping.
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
  if (!context.authenticatedUser.canWriteToCorpus()) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  const domainName = normalizeDomain(data.domainName);
  validateDomainName(domainName);

  return dbCreateOrUpdatePublisherDomain(
    context.db,
    { domainName, publisher: data.publisher },
    context.authenticatedUser.username,
  );
}
