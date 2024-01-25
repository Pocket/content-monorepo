import { Context, SQSEvent } from 'aws-lambda';
import { handler as processor } from './index';
import { random, TypeGuardError } from 'typia';
import { SQSRecord } from 'aws-lambda/trigger/sqs';
import { SqsProspectSet } from './types';

// Mock the EventBridge send method
const eventBridgeSendMock = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-eventbridge', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-eventbridge');

  return {
    ...originalModule,
    EventBridgeClient: jest.fn().mockImplementation(() => ({
      send: eventBridgeSendMock,
    })),
  };
});

describe('processor', () => {
  const mockContext = random<Context>();
  const mockCallback = () => {};

  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.restoreAllMocks());

  it('throws TypeGuardError for invalid input', async () => {
    // Generate an SQSEvent with an invalid body.
    const invalidEvent: SQSEvent = {
      Records: [
        { ...random<SQSRecord>(), body: JSON.stringify({ invalid: 'foobar' }) },
      ],
    };

    // Expect the processor to throw a TypeGuardError
    await expect(
      processor(invalidEvent, mockContext, mockCallback),
    ).rejects.toThrow(TypeGuardError);
  });

  it('sends a prospect set to EventBridge', async () => {
    const sqsEvent: SQSEvent = {
      Records: [
        {
          ...random<SQSRecord>(),
          body: JSON.stringify(random<SqsProspectSet>()),
        },
      ],
    };

    await processor(sqsEvent, mockContext, mockCallback);

    expect(eventBridgeSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Entries: [
            {
              EventBusName: 'PocketEventBridge-local-Shared-Event-Bus',
              Source: 'prospect-events',
              DetailType: 'prospect-generation',
              Detail: sqsEvent.Records[0].body,
            },
          ],
        },
      }),
    );
  });
});
