import * as Sentry from '@sentry/node';
import {
  Prospect,
  ProspectType,
  ScheduledSurfaces,
} from 'prospectapi-common';
import {
  generateEventBridgePayload,
  sendEvent,
  sendEventBridgeEvent,
} from './events';
import {
  CorpusLanguage,
  MozillaAccessGroup,
  Topics,
  UserAuth } from '../types';
import { EventBridgeEventType, ProspectReviewStatus } from './types';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import config from '../config';
import { serverLogger } from '../express';
import { setTimeout } from 'timers/promises';

/**
 * These tests are heavily influenced by prior art over at User API
 * (see eventBusHandler.spec.ts).
 */
describe('event helpers: ', () => {
  const prospect: Prospect = {
    // a GUID we generate prior to inserting into dynamo
    id: '123-abc',
    prospectId: '456-cde',
    scheduledSurfaceGuid: ScheduledSurfaces[0].guid,
    topic: Topics.ENTERTAINMENT,
    prospectType: ProspectType.TIMESPENT,
    url: 'https://www.test.com/a-story',
    saveCount: 333,
    rank: 222,
    curated: false,
    createdAt: 160000000,
    domain: 'test.com',
    excerpt: 'Once upon a time...',
    imageUrl: 'https://www.test.com/a-story.jpg',
    language: CorpusLanguage.EN,
    publisher: 'Test.com',
    title: 'A very interesting story',
    isSyndicated: false,
    isCollection: false,
    authors: 'Mark Twain, John Bon Jovi',
  };

  const authUser: UserAuth = {
    name: 'Test User',
    username: 'test-user|ldap-something',
    groups: [MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL],
    hasReadOnly: true,
    hasCuratorFull: true,
    canRead: () => true,
    canWrite: () => true,
  };

  const payload = {
    prospect: {
      ...prospect,
      prospectReviewStatus: ProspectReviewStatus.Dismissed,
      reviewedBy: authUser.username,
      reviewedAt: 1600000,
    },
    eventType: EventBridgeEventType.PROSPECT_DISMISS,
    object_version: 'new',
  };

  const clientStub: jest.SpyInstance = jest
      .spyOn(EventBridgeClient.prototype, 'send')
      .mockImplementation(() => Promise.resolve({ FailedEntryCount: 0 }));
  const sentryStub: jest.SpyInstance = jest
      .spyOn(Sentry, 'captureException')
      .mockImplementation(() => '');
  const crumbStub: jest.SpyInstance = jest
      .spyOn(Sentry, 'addBreadcrumb')
      .mockImplementation(() => Promise.resolve());
  const serverLoggerErrorStub: jest.SpyInstance = jest
      .spyOn(serverLogger, 'error')
      .mockImplementation(() => Promise.resolve());
  const now = new Date('2022-01-01 00:00:00');

  beforeAll(() => {
    jest.useFakeTimers({
      now: now,
      advanceTimers: true,
    });
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('generateEventBridgePayload function', () => {
    it('transforms Prospect object to event payload', () => {
      const payload = generateEventBridgePayload(prospect, authUser);

      expect(payload.prospect).toMatchObject(prospect);

      expect(payload.prospect.prospectReviewStatus).toEqual(
        ProspectReviewStatus.Dismissed
      );
      expect(payload.prospect.reviewedBy).toEqual(authUser.username);
      expect(typeof payload.prospect.reviewedAt).toBe('number');

      expect(payload.eventType).toEqual(EventBridgeEventType.PROSPECT_DISMISS);
      expect(payload.object_version).toEqual('new');
    });
  });

  describe('sendEvent function', () => {
    it('should send event to event bus with proper event data', async () => {
      await sendEvent(payload);

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(100);
      expect(sentryStub).toHaveBeenCalledTimes(0);
      expect(serverLoggerErrorStub).toHaveBeenCalledTimes(0);
      // Event was sent to Event Bus
      expect(clientStub).toHaveBeenCalledTimes(1);
      // Check that the payload is correct; since it's JSON, we need to decode the data
      // otherwise it also does ordering check
      const sendCommand = clientStub.mock.calls[0][0].input as any;
      expect(sendCommand).toHaveProperty('Entries');
      expect(sendCommand.Entries[0]).toMatchObject({
        Source: config.aws.eventBus.eventBridge.source,
        EventBusName: config.aws.eventBus.name,
        DetailType: EventBridgeEventType.PROSPECT_DISMISS,
      });

      // Compare to initial payload
      expect(sendCommand.Entries[0]['Detail']).toEqual(
        JSON.stringify(payload)
      );
    });

    it('should log error if any events fail to send', async () => {
      clientStub.mockRestore();
      jest
          .spyOn(EventBridgeClient.prototype, 'send')
          .mockImplementationOnce(() => Promise.resolve({ FailedEntryCount: 1 }));

      await sendEvent(payload);

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(100);

      expect(sentryStub).toHaveBeenCalledTimes(1);
      expect(sentryStub.mock.calls[0][0].message).toContain(
        `Failed to send event 'prospect-dismiss' to event bus`
      );
      expect(serverLoggerErrorStub).toHaveBeenCalledTimes(1);
      expect(serverLoggerErrorStub.mock.calls[0][0]).toEqual(
          'sendEvent: Failed to send event to event bus.'
      );
      expect(serverLoggerErrorStub.mock.calls[0][1].eventType).toEqual(
          'prospect-dismiss'
      );
    });
  });

  describe('sendEventBridgeEvent', () => {
    it('should log error if send call throws error', async () => {
      clientStub.mockRestore();
      jest
          .spyOn(EventBridgeClient.prototype, 'send')
          .mockImplementation(() => {
            throw new Error('boo!');
          });

      await sendEventBridgeEvent(prospect, authUser);

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(100);
      expect(sentryStub).toHaveBeenCalledTimes(1);
      expect(sentryStub.mock.calls[0][0].message).toContain('boo!');
      expect(crumbStub).toHaveBeenCalledTimes(1);
      expect(crumbStub.mock.calls[0][0].message).toContain(
        `Failed to send event 'prospect-dismiss' to event bus`
      );
      expect(serverLoggerErrorStub).toHaveBeenCalledTimes(1);
      expect(serverLoggerErrorStub.mock.calls[0][0]).toEqual(
          'sendEventBridgeEvent: Failed to send event to event bus.'
      );
      expect(serverLoggerErrorStub.mock.calls[0][1].eventType).toEqual(
          'prospect-dismiss'
      );
    });
  });
});
