import { setupServer } from 'msw/node';
import { Callback, Context } from 'aws-lambda';
import { processor } from './';
import {getGoodSnowplowEvents, parseSnowplowData, waitForSnowplowEvents} from 'content-common/snowplow/test-helpers';
import {SnowplowProspect} from "./events/types";

/**
 * these tests are primarily to verify the entry function can run end to end.
 * the more detailed functions called in the entry function have their own
 * tests
 */
describe('prospect api translation lambda entry function', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

  afterEach(() => {
    // restoreAllMocks restores all mocks and replaced properties. clearAllMocks only clears mocks.
    jest.restoreAllMocks();
    server.resetHandlers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    server.close();
  });

  const sqsContext = null as unknown as Context;
  const sqsCallback = null as unknown as Callback;

  it('emits a Snowplow event if prospect is successfully inserted into dynamo', async () => {
    const expectedUrls = [
        'https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all',
      'https://getpocket.com/explore/item/my-discomfort-with-comfort-food'
    ];
    const expectedPredictedTopics = ['ENTERTAINMENT', 'FOOD'];
    const fakePayload = {
      Records: [
        {
          messageId: '1',
          receiptHandle: 'handle',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: 'time',
            SenderId: 'sender id',
            ApproximateFirstReceiveTimestamp: 'time',
          },
          messageAttributes: {},
          md5OfMessageAttributes: null,
          md5OfBody: 'ab6181399b03008ffaada54b68c77574',
          eventSource: 'aws:sqs',
          eventSourceARN:
              'arn:aws:sqs:us-east-1:996905175585:ProspectAPI-Prod-Sqs-Translation-Queue',
          awsRegion: 'us-east-1',
          body: `{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}`,
        },
      ],
    };

    await processor(fakePayload, sqsContext, sqsCallback);

    const allEvents = await waitForSnowplowEvents();

    // 2 prospects created
    expect(allEvents.total).toEqual(2);
    expect(allEvents.bad).toEqual(0);

    // Check that the right Snowplow entity was included with the event.
    const goodEvents = await getGoodSnowplowEvents();
    for(let i=0; i < 2; i++) {
      const snowplowContext = parseSnowplowData(
          goodEvents[i].rawEvent.parameters.cx,
      );
      const snowplowProspectEntity = snowplowContext.data[0].data as SnowplowProspect;
      expect(snowplowProspectEntity.url).toEqual(expectedUrls[i]);
      expect(snowplowProspectEntity.features.predicted_topic).toEqual((expectedPredictedTopics[i]));
    }
  })
  it('gets correct counts when processing valid JSON', async () => {
    const fakePayload = {
      Records: [
        {
          messageId: '1',
          receiptHandle: 'handle',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: 'time',
            SenderId: 'sender id',
            ApproximateFirstReceiveTimestamp: 'time',
          },
          messageAttributes: {},
          md5OfMessageAttributes: null,
          md5OfBody: 'ab6181399b03008ffaada54b68c77574',
          eventSource: 'aws:sqs',
          eventSourceARN:
            'arn:aws:sqs:us-east-1:996905175585:ProspectAPI-Prod-Sqs-Translation-Queue',
          awsRegion: 'us-east-1',
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}',
        },
      ],
    };

    const captureConsoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await processor(fakePayload, sqsContext, sqsCallback);

    expect(captureConsoleSpy).toHaveBeenCalledWith(
      `2 prospects inserted into dynamo.`,
    );
  });

  it('gets correct counts when one prospect has an error', async () => {
    const fakePayload = {
      Records: [
        {
          messageId: '1',
          receiptHandle: 'handle',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: 'time',
            SenderId: 'sender id',
            ApproximateFirstReceiveTimestamp: 'time',
          },
          messageAttributes: {},
          md5OfMessageAttributes: null,
          md5OfBody: 'ab6181399b03008ffaada54b68c77574',
          eventSource: 'aws:sqs',
          eventSourceARN:
            'arn:aws:sqs:us-east-1:996905175585:ProspectAPI-Prod-Sqs-Translation-Queue',
          awsRegion: 'us-east-1',
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_typo":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"SYNDICATED_NEW","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}',
        },
      ],
    };

    const captureConsoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await processor(fakePayload, sqsContext, sqsCallback);

    expect(captureConsoleSpy).toHaveBeenCalledWith(
      `1 prospects inserted into dynamo.`,
    );

    expect(captureConsoleSpy).toHaveBeenCalledWith(`1 prospects had errors.`);
  });
});
