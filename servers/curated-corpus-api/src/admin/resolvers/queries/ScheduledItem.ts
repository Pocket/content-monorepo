import { AuthenticationError } from '@pocket-tools/apollo-utils';
import { getScheduledItems as dbGetScheduledItems } from '../../../database/queries';
import { ScheduledItemsResult } from '../../../database/types';
import { ACCESS_DENIED_ERROR } from '../../../shared/types';
import { IAdminContext } from '../../context';
import {
  parseResolveInfo,
  ResolveTree,
  simplifyParsedResolveInfoFragmentWithType,
} from 'graphql-parse-resolve-info';

/**
 * Retrieves a list of Approved Items that are scheduled to appear on a Scheduled Surface
 *
 */
export async function getScheduledItems(
  parent,
  { filters },
  context: IAdminContext,
  info,
): Promise<ScheduledItemsResult[]> {
  //check if the user does not have the permissions to access this query
  if (
    !context.authenticatedUser.hasReadOnly &&
    !context.authenticatedUser.canWriteToCorpus()
  ) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Parse and simplify the resolve info to understand what fields are requested
  const parsedResolveInfoFragment = parseResolveInfo(info) as ResolveTree;
  const simplifiedInfo = simplifyParsedResolveInfoFragmentWithType(
    parsedResolveInfoFragment,
    info.returnType,
  );
  const includeHasTrustedDomain =
    simplifiedInfo.fields['items']?.fieldsByTypeName.ScheduledCorpusItem
      ?.approvedItem?.fieldsByTypeName.ApprovedCorpusItem?.hasTrustedDomain;

  return await dbGetScheduledItems(
    context.db,
    filters,
    includeHasTrustedDomain,
  );
}
