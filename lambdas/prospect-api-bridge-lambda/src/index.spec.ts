import { Context, SQSEvent } from 'aws-lambda';
import { handler as processor } from './index';
import { random, TypeGuardError } from 'typia';
import { SQSRecord } from 'aws-lambda/trigger/sqs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { FirehoseClient } from '@aws-sdk/client-firehose';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

describe('processor', () => {
  const server = setupServer();

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = 'dummy_access_key_id';
    process.env.AWS_SECRET_ACCESS_KEY = 'dummy_secret_access_key';

    server.use(
      http.post('https://firehose.us-east-1.amazonaws.com/', () => {
        return HttpResponse.json({
          Encrypted: false,
          RecordId: 'foobar',
        });
      }),
    );

    server.use(
      http.post('https://events.us-east-1.amazonaws.com/', () => {
        return HttpResponse.json({
          Entries: [
            {
              EventId: '17793124-05d4-b198-2fde-7ededc63b103',
            },
          ],
          FailedEntryCount: 0,
        });
      }),
    );
  });

  afterAll(() => {
    // Clear environment variables
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    // Restore mocks
    jest.restoreAllMocks();
  });

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
            body: JSON.stringify({
              ...mockProspectSet,
              type: 'recommendation',
            }),
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
      const eventBridgeSendSpy = jest.spyOn(
        EventBridgeClient.prototype,
        'send',
      );

      const sqsEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify(mockProspectSet),
          },
        ],
      };

      await processor(sqsEvent, mockContext, mockCallback);

      expect(eventBridgeSendSpy).toHaveBeenCalledWith(
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
      const firehoseSendSpy = jest.spyOn(FirehoseClient.prototype, 'send');

      const sqsEvent: SQSEvent = {
        Records: [
          {
            ...random<SQSRecord>(),
            body: JSON.stringify(mockProspectSet),
          },
        ],
      };

      await processor(sqsEvent, mockContext, mockCallback);

      // Check that the decoded string matches the input body, with a newline added at the end.
      const callArg: any = firehoseSendSpy.mock.calls[0][0];
      const sentData = callArg.input.Record.Data;
      const decodedString = new TextDecoder().decode(sentData);
      expect(decodedString).toEqual(sqsEvent.Records[0].body + '\n');
    });
  });
});
