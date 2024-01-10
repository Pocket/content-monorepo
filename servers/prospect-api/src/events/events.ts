import {
  PutEventsCommand,
  PutEventsCommandOutput,
} from '@aws-sdk/client-eventbridge';
import * as Sentry from '@sentry/node';
import { Prospect } from 'prospectapi-common';

import config from '../config/';
import {
  EventBridgeEventType,
  ProspectDismissEventBusPayload,
  ProspectReviewStatus,
} from './types';
import { UserAuth } from '../types';
import { eventBridgeClient } from '../aws/eventBridgeClient';
import { serverLogger } from '../express';

/**
 * This method sets up the payload to send to Event Bridge for
 * the "Dismiss Prospect" event.
 *
 * @param prospect
 * @param authUser
 */
export function generateEventBridgePayload(
  prospect: Prospect,
  authUser: UserAuth
): ProspectDismissEventBusPayload {
  return {
    prospect: {
      ...prospect,
      prospectReviewStatus: ProspectReviewStatus.Dismissed,
      reviewedBy: authUser.username,
      reviewedAt: Math.round(new Date().getTime() / 1000),
    },
    // Note: the one and only event we send from Prospect API is hard-coded here. Is this wise?
    eventType: EventBridgeEventType.PROSPECT_DISMISS,
    // This is hardcoded, too.
    object_version: 'new',
  };
}

/**
 * This is a convenience method called from within a mutation resolver
 * to send off event data to Pocket Event Bridge.
 *
 * @param prospect
 * @param authUser
 */
export async function sendEventBridgeEvent(prospect, authUser) {
  // Transform mutation data to Event Bridge payload
  const payload = generateEventBridgePayload(prospect, authUser);

  // Send to Event Bridge. Yay!
  try {
    await sendEvent(payload);
  } catch (error) {
    // In the unlikely event that the payload generator throws an error,
    // log to Sentry and Cloudwatch but don't halt program
    const failedEventError = new Error(
      `Failed to send event '${
        payload.eventType
      }' to event bus. Event Body:\n ${JSON.stringify(payload)}`
    );
    // Don't halt program, but capture the failure in Sentry and Cloudwatch
    Sentry.addBreadcrumb(failedEventError);
    Sentry.captureException(error);
    serverLogger.error(
      'sendEventBridgeEvent: Failed to send event to event bus.',
      {
        eventType: payload.eventType,
        payload: payload,
        error: error,
      }
    );
  }
}

/**
 * Send event to Event Bus, pulling the event bus and the event source
 * from the config.
 * Will not throw errors if event fails; instead, log exception to Sentry
 * and add to Cloudwatch logs.
 *
 * Note: copied over from User API
 *
 * @param eventPayload the payload to send to event bus
 */
export async function sendEvent(eventPayload: any) {
  const putEventCommand = new PutEventsCommand({
    Entries: [
      {
        EventBusName: config.aws.eventBus.name,
        Detail: JSON.stringify(eventPayload),
        Source: config.aws.eventBus.eventBridge.source,
        DetailType: eventPayload.eventType,
      },
    ],
  });

  const output: PutEventsCommandOutput = await eventBridgeClient.send(
    putEventCommand
  );

  if (output.FailedEntryCount) {
    const failedEventError = new Error(
      `Failed to send event '${
        eventPayload.eventType
      }' to event bus. Event Body:\n ${JSON.stringify(eventPayload)}`
    );

    // Don't halt program, but capture the failure in Sentry and Cloudwatch
    Sentry.captureException(failedEventError);
    serverLogger.error('sendEvent: Failed to send event to event bus.', {
      eventType: eventPayload.eventType,
      payload: eventPayload,
    });
  }
}
