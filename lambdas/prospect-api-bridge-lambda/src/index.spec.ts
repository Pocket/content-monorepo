import { Context, SQSEvent } from 'aws-lambda';
import { handler as processor } from './index';
import { random, TypeGuardError } from 'typia';
import { SQSRecord } from 'aws-lambda/trigger/sqs';

// Mock the EventBridge and Firehose send methods
const eventBridgeSendMock = jest.fn().mockResolvedValue({});
const firehoseSendMock = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-eventbridge', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-eventbridge');

  return {
    ...originalModule,
    EventBridgeClient: jest.fn().mockImplementation(() => ({
      send: eventBridgeSendMock,
    })),
  };
});

jest.mock('@aws-sdk/client-firehose', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-firehose');

  return {
    ...originalModule,
    FirehoseClient: jest.fn().mockImplementation(() => ({
      send: firehoseSendMock,
    })),
  };
});

describe('processor', () => {
  const mockContext = random<Context>();
  const mockCallback = () => {};

  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.restoreAllMocks());

  const mockProspectSet = {
    id: 'aa7df642-6bb6-4fed-82bd-03c764d51c6c',
    version: 3,
    candidates: [
      {
        scheduled_surface_guid: 'NEW_TAB_EN_US',
        prospect_id: 'a598e9cc-5f8a-5062-aa16-dbca19a45134',
        url: 'https://science.nasa.gov/directorates/smd/astrophysics-division/how-nasa-chases-and-investigates-bright-cosmic-blips/',
        prospect_source: 'CONSTRAINT_SCHEDULE',
        save_count: 438,
        predicted_topic: 'SCIENCE',
        rank: 1,
      },
      {
        scheduled_surface_guid: 'NEW_TAB_EN_US',
        prospect_id: '9cc1ca00-6216-5a12-895b-37c48245fba2',
        url: 'https://www.scientificamerican.com/article/how-long-does-it-really-take-to-form-a-habit/',
        prospect_source: 'CONSTRAINT_SCHEDULE',
        save_count: 0,
        predicted_topic: 'HEALTH_FITNESS',
        rank: 2,
      },
    ],
    type: 'prospect',
    flow: 'ConstraintScheduleProspectsFlow',
    run: '109321',
    expires_at: 1706732555,
  };

  describe('validation', () => {
    it('throws SyntaxError for invalid JSON', async () => {
      const invalidEvent: SQSEvent = {
        Records: [{ ...random<SQSRecord>(), body: 'definitely not json :)' }],
      };

      await expect(
        processor(invalidEvent, mockContext, mockCallback),
      ).rejects.toThrow(SyntaxError);
    });

    it('throws TypeGuardError for an invalid version', async () => {
      // Generate an SQSEvent with an invalid body.
      const invalidEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify({ ...mockProspectSet, version: 123 }),
          },
        ],
      };

      // Expect the processor to throw a TypeGuardError
      await expect(
        processor(invalidEvent, mockContext, mockCallback),
      ).rejects.toThrow(TypeGuardError);
    });

    it('throws TypeGuardError for an invalid candidate set type', async () => {
      // Generate an SQSEvent with an invalid body.
      const invalidEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify({ ...mockProspectSet, type: 'recommendation' }),
          },
        ],
      };

      // Expect the processor to throw a TypeGuardError
      await expect(
        processor(invalidEvent, mockContext, mockCallback),
      ).rejects.toThrow(TypeGuardError);
    });
  });

  describe('EventBridge', () => {
    it('sends a valid prospect set to EventBridge', async () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify(mockProspectSet),
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

  describe('Firehose', () => {
    it('sends the body to Firehose with a newline', async () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify(mockProspectSet),
          },
        ],
      };

      await processor(sqsEvent, mockContext, mockCallback);

      // Check if Firehose send was called correctly
      expect(firehoseSendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            DeliveryStreamName: 'MetaflowTools-Local-1-RecsAPICandidateSet',
            Record: {
              Data: expect.any(Uint8Array),
            },
          },
        }),
      );

      // Check that the decoded string matches the input body, with a newline added at the end.
      const callArg = firehoseSendMock.mock.calls[0][0];
      const sentData = callArg.input.Record.Data;
      const decodedString = new TextDecoder().decode(sentData);
      expect(decodedString).toEqual(sqsEvent.Records[0].body + '\n');
    });
  });
});
