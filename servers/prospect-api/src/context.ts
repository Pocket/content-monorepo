import { dbClient } from 'prospectapi-common';
import {
  ScheduledSurfaceGuidToMozillaAccessGroup,
  MozillaAccessGroup,
  UserAuth,
  Context,
} from './types';

export const getContext = ({ req }): Context => {
  const groups = req.headers.groups as string;
  const authGroups = groups ? groups.split(',') : [];

  const userAuth: UserAuth = {
    name: req.headers.name as string,
    username: req.headers.username as string,
    groups: authGroups,
    hasReadOnly: authGroups.includes(MozillaAccessGroup.READONLY),
    hasCuratorFull:
      authGroups.includes(
        MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL,
      ) ||
      (process.env.NODE_ENV === 'development' &&
        authGroups.includes(MozillaAccessGroup.DEVELOPMENT_FULL)),
    // to determine if user has read access
    // note that canRead will be only used in queries and not in mutations
    canRead: (scheduledSurfaceGuid: string): boolean =>
      userAuth.hasReadOnly || userAuth.canWrite(scheduledSurfaceGuid),

    // to determine if user can read and write
    canWrite: (scheduledSurfaceGuid: string): boolean => {
      if (userAuth.hasCuratorFull) {
        return true;
      }

      const authGroupForScheduledSurface =
        ScheduledSurfaceGuidToMozillaAccessGroup[scheduledSurfaceGuid];

      return userAuth.groups?.includes(authGroupForScheduledSurface) ?? false;
    },
  };

  const context = {
    db: dbClient,
    userAuth,
  };

  return context;
};
