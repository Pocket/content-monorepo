import { CuratedStatus } from '.prisma/client';
import { EventBusHandler } from './EventBusHandler';
import { CuratedCorpusEventEmitter } from '../curatedCorpusEventEmitter';
import { CorpusItemSource, Topics, ScheduledItemSource } from 'content-common';
import { ScheduledItem } from '../../database/types';
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
import { serverLogger } from '@pocket-tools/ts-logger';

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
  source: ScheduledItemSource.MANUAL,

  approvedItem: {
    id: 123,
    externalId: '123-abc',
    prospectId: '456-dfg',
    url: 'https://test.com/a-story',
    domainName: 'test.com',
    status: CuratedStatus.RECOMMENDATION,
    title: 'Everything you need to know about React',
    excerpt: 'Something here',
    publisher: 'Octopus Publishing House',
    datePublished: null,
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
  const clientStub: jest.SpyInstance = jest
    .spyOn(EventBridgeClient.prototype, 'send')
    .mockImplementation(() => Promise.resolve({ FailedEntryCount: 0 }));
  const sentryStub: jest.SpyInstance = jest
    .spyOn(Sentry, 'captureException')
    .mockImplementation(() => '');
  const serverLoggerErrorStub: jest.SpyInstance = jest
    .spyOn(serverLogger, 'error')
    .mockImplementation(() => {
      return serverLogger;
    });
  const emitter = new CuratedCorpusEventEmitter();
  new EventBusHandler(emitter);
  const scheduledEventData: ScheduledCorpusItemPayload = {
    scheduledCorpusItem,
  };

  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.restoreAllMocks());

  it('registers listeners on all events in the config map', () => {
    const fake = jest.fn().mockReturnValue({ eventType: 'fake' });
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
    expect(fake).toHaveBeenCalledTimes(2);
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
      expect(sentryStub).toHaveBeenCalledTimes(0);
      expect(serverLoggerErrorStub).toHaveBeenCalledTimes(0);
      // Listener was registered on event
      expect(
        emitter.listeners(ReviewedCorpusItemEventType.UPDATE_ITEM).length,
      ).toBe(1);
      // Event was sent to Event Bus
      expect(clientStub).toHaveBeenCalledTimes(1);
      // Check that the payload is correct; since it's JSON, we need to decode the data
      // otherwise it also does ordering check
      const sendCommand = clientStub.mock.calls[0][0].input as any;
      expect(sendCommand).toHaveProperty('Entries');
      expect(sendCommand.Entries[0]).toMatchObject({
        Source: config.eventBridge.source,
        EventBusName: config.aws.eventBus.name,
        DetailType: config.eventBridge.updateApprovedItemEventType,
      });
      expect(JSON.parse(sendCommand.Entries[0]['Detail'])).toEqual(
        expectedEvent,
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
        expect(sentryStub).toHaveBeenCalledTimes(0);
        expect(serverLoggerErrorStub).toHaveBeenCalledTimes(0);
        // Listener was registered on event
        expect(emitter.listeners(emittedEvent).length).toBe(1);
        // Event was sent to Event Bus
        expect(clientStub).toHaveBeenCalledTimes(1);
        // Check that the payload is correct; since it's JSON, we need to decode the data
        // otherwise it also does ordering check
        const sendCommand = clientStub.mock.calls[0][0].input as any;
        expect(sendCommand).toHaveProperty('Entries');
        expect(sendCommand.Entries[0]).toMatchObject({
          Source: config.eventBridge.source,
          EventBusName: config.aws.eventBus.name,
          DetailType: eventType,
        });
        expect(JSON.parse(sendCommand.Entries[0]['Detail'])).toEqual(
          expectedEvent,
        );
      },
    );
  });
  it('should log error if any events fail to send', async () => {
    clientStub.mockRestore();
    jest
      .spyOn(EventBridgeClient.prototype, 'send')
      .mockImplementationOnce(() => Promise.resolve({ FailedEntryCount: 1 }));
    emitter.emit(ScheduledCorpusItemEventType.ADD_SCHEDULE, {
      ...scheduledEventData,
      eventType: ScheduledCorpusItemEventType.ADD_SCHEDULE,
    });
    // Wait just a tad in case promise needs time to resolve
    await setTimeout(100);
    expect(sentryStub).toHaveBeenCalledTimes(1);
    expect(sentryStub.mock.calls[0][0].message).toContain(
      `Failed to send event 'add-scheduled-item' to event bus`,
    );
    expect(serverLoggerErrorStub).toHaveBeenCalledTimes(1);
    expect(serverLoggerErrorStub.mock.calls[0][0]).toEqual(
      `sendEvent: Failed to send event to event bus`,
    );
  });
});
