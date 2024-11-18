import * as Sentry from '@sentry/node';

import { getCollectionByInternalId } from '../database/queries';
import { PrismaClient } from '.prisma/client';
import { sendEventBridgeEvent } from './events';
import { EventBridgeEventType } from './types';

/**
 *
 * Function called in the collection stories database mutation functions for create and update to emit to eventbridge
 *
 * This function is in its own file and *not* in events.ts for testing purposes. In tests, we mock events.ts/sendEventBrigdeEvent.
 * This works fine until the function below tries to call it, as the Jest mock only mocks the *imported* name "sendEventBridgeEvent" -
 * not the name that would be called *in-file* if this function lived in events.ts.
 *
 * (This is tricky and open to improvement.)
 */
export async function sendEventBridgeEventUpdateFromInternalCollectionId(
  dbClient: PrismaClient,
  collectionId: number,
) {
  Sentry.addBreadcrumb({
    level: 'debug',
    message: 'fetching collection for eventbridge',
    data: { collectionId },
  });
  // retrieve the current record, pre-update
  const collection = await getCollectionByInternalId(dbClient, collectionId);

  if (!collection) {
    Sentry.captureEvent({
      message:
        'Could not find collection to send to event bridge for an update',
    });
    // No-op because not being able to send an event should not be a fatal error
    return;
  }
  // Send to event bridge with the data
  await sendEventBridgeEvent(
    dbClient,
    EventBridgeEventType.COLLECTION_UPDATED,
    collection,
  );
}
