import { CuratedStatus } from '@prisma/client';
import { EventBusHandler } from './EventBusHandler';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { CorpusItemSource, Topics } from '../../shared/types';
import { ScheduledItem } from '../../database/types';
import sinon from 'sinon';
import * as Sentry from '@sentry/node';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import {
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
  ScheduledItemEventBusPayload,
  ApprovedItemEventBusPayload,
  ReviewedCorpusItemEventType,
} from '../types';
import config from '../../config';
import { setTimeout } from 'timers/promises';
import EventEmitter from 'events';
import { serverLogger } from '../../express';

/**
 * Mock event payload
 */
const scheduledCorpusItem: ScheduledItem = {
  id: 789,
  externalId: '789-xyz',
  approvedItemId: 123,
  scheduledSurfaceGuid: 'NEW_TAB_EN_US',
  scheduledDate: new Date('2030-01-01'),
  createdAt: new Date(1648225373000),
  createdBy: 'Amy',
  updatedAt: new Date(1648225373000),
  updatedBy: 'Amy',

  approvedItem: {
    id: 123,
    externalId: '123-abc',
    prospectId: '456-dfg',
    url: 'https://test.com/a-story',
    status: CuratedStatus.RECOMMENDATION,
    title: 'Everything you need to know about React',
    excerpt: 'Something here',
    publisher: 'Octopus Publishing House',
    imageUrl: 'https://test.com/image.png',
    language: 'EN',
    topic: Topics.EDUCATION,
    source: CorpusItemSource.PROSPECT,
    isCollection: false,
    isSyndicated: false,
    isTimeSensitive: false,
    createdAt: new Date(1648225373000),
    createdBy: 'Amy',
    updatedAt: new Date(1648225373000),
    updatedBy: 'Amy',
    authors: [{ name: 'Octavia Butler', sortOrder: 1 }],
  },
};

describe('EventBusHandler', () => {
  const sandbox = sinon.createSandbox();
  const clientStub = sandbox
    .stub(EventBridgeClient.prototype, 'send')
    .resolves({ FailedEntryCount: 0 });
  const sentryStub = sandbox.stub(Sentry, 'captureException').resolves();
  const serverLoggerStub = sandbox.stub(serverLogger, 'error');
  const emitter = new CuratedCorpusEventEmitter();
  new EventBusHandler(emitter);
  const scheduledEventData: ScheduledCorpusItemPayload = {
    scheduledCorpusItem,
  };

  afterEach(() => sandbox.resetHistory());
  afterAll(() => sandbox.restore());
  it('registers listeners on all events in the config map', () => {
    const fake = sinon.stub().returns({ eventType: 'fake' });
    const testEmitter = new EventEmitter();
    const mapping = {
      [ScheduledCorpusItemEventType.ADD_SCHEDULE]: () => fake(),
      [ScheduledCorpusItemEventType.REMOVE_SCHEDULE]: () => fake(),
    };
    new EventBusHandler(testEmitter, mapping);
    expect(testEmitter.listeners('ADD_SCHEDULE').length).toBe(1);
    expect(testEmitter.listeners('REMOVE_SCHEDULE').length).toBe(1);
    testEmitter.emit('ADD_SCHEDULE');
    testEmitter.emit('REMOVE_SCHEDULE');
    expect(fake.callCount).toBe(2);
  });
  describe('approved item events', () => {
    it('update-approved-item should send event with proper data', async () => {
      const expectedEvent: ApprovedItemEventBusPayload = {
        approvedItemExternalId: '123-abc',
        url: 'https://test.com/a-story',
        title: 'Everything you need to know about React',
        excerpt: 'Something here',
        publisher: 'Octopus Publishing House',
        imageUrl: 'https://test.com/image.png',
        language: 'EN',
        topic: 'EDUCATION',
        isSyndicated: false,
        createdAt: new Date(1648225373000).toUTCString(),
        createdBy: 'Amy',
        updatedAt: new Date(1648225373000).toUTCString(),
        eventType: config.eventBridge.updateApprovedItemEventType,
        authors: scheduledCorpusItem.approvedItem.authors,
      };
      emitter.emit(ReviewedCorpusItemEventType.UPDATE_ITEM, {
        reviewedCorpusItem: scheduledCorpusItem.approvedItem,
        eventType: ReviewedCorpusItemEventType.UPDATE_ITEM,
      });
      // Wait just a tad in case promise needs time to resolve
      await setTimeout(100);
      expect(sentryStub.callCount).toBe(0);
      expect(serverLoggerStub.callCount).toBe(0);
      // Listener was registered on event
      expect(
        emitter.listeners(ReviewedCorpusItemEventType.UPDATE_ITEM).length
      ).toBe(1);
      // Event was sent to Event Bus
      expect(clientStub.callCount).toBe(1);
      // Check that the payload is correct; since it's JSON, we need to decode the data
      // otherwise it also does ordering check
      const sendCommand = clientStub.getCall(0).args[0].input as any;
      expect(sendCommand).toHaveProperty('Entries');
      expect(sendCommand.Entries[0]).toMatchObject({
        Source: config.eventBridge.source,
        EventBusName: config.aws.eventBus.name,
        DetailType: config.eventBridge.updateApprovedItemEventType,
      });
      expect(JSON.parse(sendCommand.Entries[0]['Detail'])).toEqual(
        expectedEvent
      );
    });
  });
  describe('scheduled item events', () => {
    const partialExpectedEvent: Omit<
      ScheduledItemEventBusPayload,
      'eventType'
    > = {
      scheduledItemExternalId: '789-xyz',
      approvedItemExternalId: '123-abc',
      url: 'https://test.com/a-story',
      title: 'Everything you need to know about React',
      excerpt: 'Something here',
      publisher: 'Octopus Publishing House',
      imageUrl: 'https://test.com/image.png',
      language: 'EN',
      topic: 'EDUCATION',
      isSyndicated: false,
      createdAt: new Date(1648225373000).toUTCString(),
      createdBy: 'Amy',
      updatedAt: new Date(1648225373000).toUTCString(),
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2030-01-01',
      authors: [
        {
          name: 'Octavia Butler',
          sortOrder: 1,
        },
      ],
    };
    it.each([
      [
        config.eventBridge.addScheduledItemEventType,
        ScheduledCorpusItemEventType.ADD_SCHEDULE,
      ],
      [
        config.eventBridge.removeScheduledItemEventType,
        ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
      ],
      [
        config.eventBridge.updateScheduledItemEventType,
        ScheduledCorpusItemEventType.RESCHEDULE,
      ],
    ])(
      '%s: should send event to event bus with proper event data',
      async (eventType, emittedEvent) => {
        emitter.emit(emittedEvent, {
          ...scheduledEventData,
          eventType: emittedEvent,
        });
        const expectedEvent: ScheduledItemEventBusPayload = {
          eventType,
          ...partialExpectedEvent,
        };
        // Wait just a tad in case promise needs time to resolve
        await setTimeout(100);
        expect(sentryStub.callCount).toBe(0);
        expect(serverLoggerStub.callCount).toBe(0);
        // Listener was registered on event
        expect(emitter.listeners(emittedEvent).length).toBe(1);
        // Event was sent to Event Bus
        expect(clientStub.callCount).toBe(1);
        // Check that the payload is correct; since it's JSON, we need to decode the data
        // otherwise it also does ordering check
        const sendCommand = clientStub.getCall(0).args[0].input as any;
        expect(sendCommand).toHaveProperty('Entries');
        expect(sendCommand.Entries[0]).toMatchObject({
          Source: config.eventBridge.source,
          EventBusName: config.aws.eventBus.name,
          DetailType: eventType,
        });
        expect(JSON.parse(sendCommand.Entries[0]['Detail'])).toEqual(
          expectedEvent
        );
      }
    );
  });
  it('should log error if any events fail to send', async () => {
    clientStub.restore();
    sandbox
      .stub(EventBridgeClient.prototype, 'send')
      .resolves({ FailedEntryCount: 1 });
    emitter.emit(ScheduledCorpusItemEventType.ADD_SCHEDULE, {
      ...scheduledEventData,
      eventType: ScheduledCorpusItemEventType.ADD_SCHEDULE,
    });
    // Wait just a tad in case promise needs time to resolve
    await setTimeout(100);
    expect(sentryStub.callCount).toBe(1);
    expect(sentryStub.getCall(0).firstArg.message).toContain(
      `Failed to send event 'add-scheduled-item' to event bus`
    );
    expect(serverLoggerStub.callCount).toBe(1);
    expect(serverLoggerStub.getCall(0).firstArg).toContain(
      `sendEvent: Failed to send event to event bus`
    );
  });
});
