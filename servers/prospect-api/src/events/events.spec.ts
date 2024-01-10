import { expect } from 'chai';
import sinon from 'sinon';
import * as Sentry from '@sentry/node';
import {
  CorpusLanguage,
  Prospect,
  ProspectType,
  ScheduledSurfaces,
  Topics,
} from 'prospectapi-common';
import {
  generateEventBridgePayload,
  sendEvent,
  sendEventBridgeEvent,
} from './events';
import { MozillaAccessGroup, UserAuth } from '../types';
import { EventBridgeEventType, ProspectReviewStatus } from './types';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import config from '../config';
import { serverLogger } from '../express';

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

  const sandbox = sinon.createSandbox();
  const clientStub = sandbox
    .stub(EventBridgeClient.prototype, 'send')
    .resolves({ FailedEntryCount: 0 });
  const sentryStub = sandbox.stub(Sentry, 'captureException').resolves();
  const crumbStub = sandbox.stub(Sentry, 'addBreadcrumb').resolves();
  const serverLoggerErrorSpy = sandbox.spy(serverLogger, 'error');
  const now = new Date('2022-01-01 00:00:00');
  let clock;

  beforeAll(() => {
    clock = sinon.useFakeTimers({
      now: now,
      shouldAdvanceTime: false,
    });
  });

  afterEach(() => sandbox.resetHistory());
  afterAll(() => {
    sandbox.restore();
    clock.restore();
  });

  describe('generateEventBridgePayload function', () => {
    it('transforms Prospect object to event payload', () => {
      const payload = generateEventBridgePayload(prospect, authUser);

      expect(payload.prospect).to.contain(prospect);

      expect(payload.prospect.prospectReviewStatus).to.equal(
        ProspectReviewStatus.Dismissed
      );
      expect(payload.prospect.reviewedBy).to.equal(authUser.username);
      expect(payload.prospect.reviewedAt).to.be.a('number');

      expect(payload.eventType).to.equal(EventBridgeEventType.PROSPECT_DISMISS);
      expect(payload.object_version).to.equal('new');
    });
  });

  describe('sendEvent function', () => {
    it('should send event to event bus with proper event data', async () => {
      await sendEvent(payload);

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(0);
      expect(serverLoggerErrorSpy.callCount).to.equal(0);

      // Event was sent to Event Bus
      expect(clientStub.callCount).to.equal(1);

      // Check that the payload is correct; since it's JSON, we need to decode the data
      // otherwise it also does ordering check
      const sendCommand = clientStub.getCall(0).args[0].input as any;
      expect(sendCommand).to.have.property('Entries');
      expect(sendCommand.Entries[0]).to.contain({
        Source: config.aws.eventBus.eventBridge.source,
        EventBusName: config.aws.eventBus.name,
        DetailType: EventBridgeEventType.PROSPECT_DISMISS,
      });

      // Compare to initial payload
      expect(sendCommand.Entries[0]['Detail']).to.equal(
        JSON.stringify(payload)
      );
    });

    it('should log error if any events fail to send', async () => {
      clientStub.restore();
      sandbox
        .stub(EventBridgeClient.prototype, 'send')
        .resolves({ FailedEntryCount: 1 });

      await sendEvent(payload);

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);

      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'prospect-dismiss' to event bus`
      );
      expect(serverLoggerErrorSpy.callCount).to.equal(1);
      expect(serverLoggerErrorSpy.getCall(0).firstArg).to.equal(
        `sendEvent: Failed to send event to event bus.`
      );
      expect(serverLoggerErrorSpy.getCall(0).lastArg.eventType).to.equal(
        'prospect-dismiss'
      );
    });
  });

  describe('sendEventBridgeEvent', () => {
    it('should log error if send call throws error', async () => {
      clientStub.restore();
      sandbox
        .stub(EventBridgeClient.prototype, 'send')
        .rejects(new Error('boo!'));

      await sendEventBridgeEvent(prospect, authUser);

      // Wait just a tad in case promise needs time to resolve
      setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain('boo!');
      expect(crumbStub.callCount).to.equal(1);
      expect(crumbStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'prospect-dismiss' to event bus`
      );
      expect(serverLoggerErrorSpy.callCount).to.equal(1);
      expect(serverLoggerErrorSpy.getCall(0).firstArg).to.equal(
        'sendEventBridgeEvent: Failed to send event to event bus.'
      );
      expect(serverLoggerErrorSpy.getCall(0).lastArg.eventType).to.equal(
        'prospect-dismiss'
      );
    });
  });
});
