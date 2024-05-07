import { ScheduledSurface } from '../../../database/types';
import { ScheduledSurfaces } from 'content-common';
import { UserInputError } from '@pocket-tools/apollo-utils';

/**
 * Retrieves a Scheduled Surface (for example, New Tab) for a given GUID.
 */
export async function getScheduledSurface(
  parent,
  args,
  { db }
): Promise<ScheduledSurface> {
  const { id } = args;

  // Data retrieval is super simple here given that we store shared data,
  // such as Scheduled Surface values, as hardcoded values at the moment.
  const surface = ScheduledSurfaces.find((surface) => {
    return surface.guid === id;
  });

  if (!surface) {
    throw new UserInputError(
      `Could not find Scheduled Surface with id of "${id}".`
    );
  }

  return {
    id: surface.guid,
    name: surface.name,
  };
}
