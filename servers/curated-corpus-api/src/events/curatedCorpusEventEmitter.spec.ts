import { CuratedCorpusEventEmitter } from './curatedCorpusEventEmitter';
import {
  ReviewedCorpusItemPayload,
  ScheduledCorpusItemPayload,
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
} from './types';
import config from '../config';
import { getUnixTimestamp } from '../shared/utils';
import { ApprovedItem } from '../database/types';
import { RejectedCuratedCorpusItem } from '.prisma/client';
import { ApprovedItemGrade, Topics } from 'content-common';
import {
  CorpusItemSource,
  CuratedStatus,
  ScheduledItemSource,
} from 'content-common';

describe('CuratedCorpusEventEmitter', () => {
  const emitter = new CuratedCorpusEventEmitter();
  const date = new Date(2022, 9, 4, 15, 30);
  const unixDate = getUnixTimestamp(date);
  const handler = jest.fn();

  Object.values(ReviewedCorpusItemEventType).forEach((event: string) =>
    emitter.on(event, handler),
  );

  Object.values(ScheduledCorpusItemEventType).forEach((event: string) =>
    emitter.on(event, handler),
  );

  const approvedItem: ApprovedItem = {
    externalId: '123-abc',
    prospectId: 'abc-123',
    url: 'https://test.com',
    domainName: 'test.com',
    grade: ApprovedItemGrade.A,
    status: CuratedStatus.CORPUS,
    id: 123,
    title: 'Test title',
    excerpt: 'An excerpt',
    language: 'EN',
    publisher: 'The Times of Narnia',
    datePublished: null,
    imageUrl: 'https://test.com/image.png',
    topic: Topics.EDUCATION,
    source: CorpusItemSource.PROSPECT,
    isCollection: false,
    isTimeSensitive: false,
    isSyndicated: false,
    createdAt: new Date(),
    createdBy: 'Anyone',
    updatedAt: new Date(),
    updatedBy: null,
    authors: [{ name: 'Octavia Butler', sortOrder: 1 }],
  };

  const approvedItemPayload: ReviewedCorpusItemPayload = {
    reviewedCorpusItem: approvedItem,
  };

  // Set up separately to the main payload - only for scheduling events
  // when we need to send this data
  const scheduledItemPayload: ScheduledCorpusItemPayload = {
    scheduledCorpusItem: {
      id: 1234,
      externalId: '1234-abc',
      approvedItemId: 123,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      createdAt: new Date(),
      createdBy: '',
      updatedAt: new Date(),
      updatedBy: null,
      scheduledDate: new Date(),
      approvedItem: approvedItem,
      source: ScheduledItemSource.MANUAL,
    },
  };

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeAll(() => {
    jest.useFakeTimers({
      now: date,
      advanceTimers: true,
    });
  });

  afterEach(() => {
    handler.mockReset();
  });

  it('should emit an ADD_ITEM event with expected data', () => {
    // Event is emitted synchronously so don't need to wait
    emitter.emitEvent(
      ReviewedCorpusItemEventType.ADD_ITEM,
      approvedItemPayload,
    );
    const expectedData = {
      ...approvedItemPayload,
      eventType: ReviewedCorpusItemEventType.ADD_ITEM,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });

  it('should emit an UPDATE_ITEM event with expected data', () => {
    // Event is emitted synchronously so don't need to wait
    emitter.emitEvent(
      ReviewedCorpusItemEventType.UPDATE_ITEM,
      approvedItemPayload,
    );
    const expectedData = {
      ...approvedItemPayload,
      eventType: ReviewedCorpusItemEventType.UPDATE_ITEM,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });

  it('should emit a REMOVE_ITEM event with expected data', () => {
    // Event is emitted synchronously so don't need to wait
    emitter.emitEvent(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
      approvedItemPayload,
    );
    const expectedData = {
      ...approvedItemPayload,
      eventType: ReviewedCorpusItemEventType.REMOVE_ITEM,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });

  it('should emit a REJECT_ITEM event with expected data', () => {
    // This event returns the data stored in RejectedItem entity internally
    const rejectedItem: RejectedCuratedCorpusItem = {
      id: 123,
      externalId: '345-abc',
      prospectId: 'abc-543',
      url: 'https://test.com',
      title: 'Rejected item title',
      topic: Topics.POLITICS,
      language: 'EN',
      publisher: 'Any Publisher',
      reason: 'ERROR',
      createdAt: new Date(),
      createdBy: 'Anyone',
    };

    const rejectedPayload: ReviewedCorpusItemPayload = {
      reviewedCorpusItem: rejectedItem,
    };

    emitter.emitEvent(ReviewedCorpusItemEventType.REJECT_ITEM, rejectedPayload);
    const expectedData = {
      ...rejectedPayload,
      eventType: ReviewedCorpusItemEventType.REJECT_ITEM,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });

  it('should emit an ADD_SCHEDULE event with expected data', () => {
    emitter.emitEvent(
      ScheduledCorpusItemEventType.ADD_SCHEDULE,
      scheduledItemPayload,
    );
    const expectedData = {
      ...scheduledItemPayload,
      eventType: ScheduledCorpusItemEventType.ADD_SCHEDULE,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });

  it('should emit a REMOVE_SCHEDULE event with expected data', () => {
    emitter.emitEvent(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
      scheduledItemPayload,
    );
    const expectedData = {
      ...scheduledItemPayload,
      eventType: ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
      timestamp: unixDate,
      source: config.events.source,
      version: config.events.version,
    };
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(expectedData);
  });
});
