import { GraphQLError } from 'graphql';
import { ScheduleReview } from '.prisma/client';
import { CuratedCorpusApiErrorCodes } from 'content-common';
import {
  AuthenticationError,
  UserInputError,
} from '@pocket-tools/apollo-utils';

import { IAdminContext } from '../../../context';
import { createScheduleReview as dbCreateScheduleReview } from '../../../../database/mutations';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';
import { scheduledSurfaceAllowedValues } from '../../../../shared/utils';

/**
 * Marks the given scheduled surface as reviewed by human curators for a given date.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function createScheduleReview(
  parent,
  { data },
  context: IAdminContext,
): Promise<ScheduleReview> {
  // Check if the user can execute this mutation.
  if (!context.authenticatedUser.canWriteToSurface(data.scheduledSurfaceGuid)) {
    throw new AuthenticationError(ACCESS_DENIED_ERROR);
  }

  // Check if the specified Scheduled Surface GUID actually exists.
  if (!scheduledSurfaceAllowedValues.includes(data.scheduledSurfaceGuid)) {
    throw new UserInputError(
      `Cannot mark a surface as reviewed with Scheduled Surface GUID of "${data.scheduledSurfaceGuid}".`,
    );
  }

  try {
    const scheduleReview = await dbCreateScheduleReview(
      context.db,
      data,
      context.authenticatedUser.username,
    );
    return scheduleReview;
  } catch (error) {
    // If it's the duplicate entry constraint, catch the error
    // and send a user-friendly one to the client instead.
    if (error.code === 'P2002') {
      throwAlreadyReviewedError(data.scheduledSurfaceGuid, data.scheduledDate);
    }

    // If it's something else, throw the error unchanged.
    throw error;
  }
}

function throwAlreadyReviewedError(
  scheduledSurfaceGuid: string,
  scheduledDate: Date,
) {
  throw new GraphQLError(
    `The ${scheduledSurfaceGuid} surface has already been reviewed on ${scheduledDate.toLocaleString(
      'en-US',
      {
        dateStyle: 'medium',
        timeZone: 'UTC',
      },
    )}.`,
    {
      extensions: { code: CuratedCorpusApiErrorCodes.ALREADY_REVIEWED },
    },
  );
}
