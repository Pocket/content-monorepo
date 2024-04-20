import { getTrustedDomain } from '../../../database/mutations/TrustedDomain';
import { getNormalizedDomainName } from '../../../shared/utils';
import { AuthenticationError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../../../shared/types';

/**
 * Returns true if the ApprovedItem's domain is in the TrustedDomain table.
 * @param item ApprovedItem with a url attribute.
 * @param args
 * @param context
 */
export const hasTrustedDomain = async (
  item,
  args,
  context,
): Promise<boolean> => {
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  const trustedDomain = await getTrustedDomain(
    context.db,
    // item.domainName is currently not queryable, so we get the domainName from the url.
    getNormalizedDomainName(item.url),
  );
  return !!trustedDomain;
};
