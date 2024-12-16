import { setupServer } from 'msw/node';
import { Callback, Context } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

import config from './config';

import { processor } from './';
import {
  SnowplowProspect,
  getGoodSnowplowEvents,
  parseSnowplowData,
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common';

/**
 * these tests are primarily to verify the entry function can run end to end.
 * the more detailed functions called in the entry function have their own
 * tests
 */
describe('prospect api translation lambda entry function', () => {
  const server = setupServer();
  const captureConsoleSpy = jest.spyOn(console, 'log').mockImplementation();
  const sentrySpy = jest.spyOn(Sentry, 'captureException').mockImplementation();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

  beforeEach(() => {
    // The Lambda waits for 10 seconds to flush Snowplow events. During tests we don't want to wait that long.
    jest.replaceProperty(config.snowplow, 'emitterDelay', 500);
  });

  afterEach(() => {
    // clear all mock history
    jest.clearAllMocks();
    server.resetHandlers();
  });

  afterAll(() => {
    // restore all mocks and replaced properties/methods
    jest.restoreAllMocks();
    server.close();
  });

  const sqsContext = null as unknown as Context;
  const sqsCallback = null as unknown as Callback;

  it('emits a Snowplow event if prospect is successfully inserted into dynamo', async () => {
    await resetSnowplowEvents();

    const expectedUrls = [
      'https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all',
      'https://getpocket.com/explore/item/my-discomfort-with-comfort-food',
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
          body: `{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}`,
        },
      ],
    };

    await processor(fakePayload, sqsContext, sqsCallback);

    const allEvents = await waitForSnowplowEvents(2);

    // 2 prospects created
    expect(allEvents.total).toEqual(2);
    expect(allEvents.bad).toEqual(0);

    // Check that the right Snowplow entity was included with the event.
    const goodEvents = await getGoodSnowplowEvents();

    for (let i = 0; i < 2; i++) {
      const snowplowContext = parseSnowplowData(
        goodEvents[i].rawEvent.parameters.cx,
      );
      const snowplowProspectEntity = snowplowContext.data[0]
        .data as SnowplowProspect;
      expect(expectedUrls.includes(snowplowProspectEntity.url)).toBeTruthy();
      expect(
        expectedPredictedTopics.includes(
          snowplowProspectEntity.features.predicted_topic,
        ),
      ).toBeTruthy();
    }
  });
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
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}',
        },
      ],
    };

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
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_typo":"NEW_TAB_EN_US","prospect_id":"f920104e-bd7e-5a19-94e3-767c5f30e073","url":"https://getpocket.com/explore/item/my-discomfort-with-comfort-food","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"FOOD","rank":1,"data_source":"prospect"},{"scheduled_surface_guid":"NEW_TAB_EN_US","prospect_id":"9c3d7650-e331-5926-9be2-5faaa0467217","url":"https://getpocket.com/explore/item/fun-delivered-world-s-foremost-experts-on-whoopee-cushions-and-silly-putty-tell-all","prospect_source":"TOP_SAVED","save_count":0,"predicted_topic":"ENTERTAINMENT","rank":2,"data_source":"prospect"}]}}',
        },
      ],
    };

    await processor(fakePayload, sqsContext, sqsCallback);

    expect(captureConsoleSpy).toHaveBeenCalledWith(
      `1 prospects inserted into dynamo.`,
    );

    expect(captureConsoleSpy).toHaveBeenCalledWith(`1 prospects had errors.`);
  });

  it('accepts prospects with ML-supplied URL metadata', async () => {
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
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid": "NEW_TAB_DE_DE", "prospect_id": "447c90d2-1084-5f83-a585-26edfbf5640e", "url": "https://www.spektrum.de/news/ninetyeast-ridge-eines-der-laengsten-gebirge-liegt-tief-unter-dem-meer/2246024", "prospect_source": "QA_SPORTS", "save_count": 0, "predicted_topic": "", "rank": 117, "data_source": "prospect", "title": "Eines der l\u00e4ngsten Gebirge liegt tief unter dem Meer", "excerpt": "Die Bergkette wurde durch ein seltenes vulkanisches Ph\u00e4nomen gebildet", "language": "EN", "image_url": "https://static.spektrum.de/fm/912/f1920x1080/triplejunction_gis_2014_lrg.8200272.png", "authors": ["Daniel Lingenh\u00f6hl"]},{"scheduled_surface_guid": "NEW_TAB_DE_DE", "prospect_id": "faa0631f-3a43-555a-9947-7ce3de165a92", "url": "https://www.spiegel.de/ausland/wahlen-in-thailand-wie-eine-kandidatin-fuer-ein-demokratischeres-thailand-kaempft-a-1fa52682-ca7a-45f9-816a-a031ca0a7950", "prospect_source": "QA_SPORTS", "save_count": 10, "predicted_topic": "POLITICS", "rank": 118, "data_source": "prospect", "title": "Parlamentswahlen in Thailand Frau Thamnitinans Kampf gegen die Putschisten", "excerpt": "Sie vertritt als Anwältin Regimegegner. Nun will Sasinan Thamnitinan sich im Parlament für mehr Demokratie in Thailand einsetzen. Unterwegs im ersten Wahlkampf nach den landesweiten Massenprotesten gegen das Militär.", "language": "DE", "image_url": "https://cdn.prod.www.spiegel.de/images/06720642-d6e0-42ed-a1e1-1ded9f79d1bd_w1280_r1.77_fpx68_fpy93.jpg", "authors": ["Maria Stöhr, DER SPIEGEL"]}]}}',
        },
      ],
    };

    await processor(fakePayload, sqsContext, sqsCallback);

    expect(sentrySpy).toHaveBeenCalledTimes(0);

    expect(captureConsoleSpy).toHaveBeenCalledWith(
      `2 prospects inserted into dynamo.`,
    );
  });

  it('should send errors to Sentry when ML-supplied URL metadata is invalid', async () => {
    // this payload has three errors in the second/last prospect:
    // - missing title
    // - number given for authors
    // - invalid language code
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
          body: '{"version":"0","id":"ab02d85b-4cb6-9de9-b549-b572166b278f","detail-type":"prospect-generation","source":"prospect-events","account":"996905175585","time":"2024-04-16T00:05:59Z","region":"us-east-1","resources":[],"detail":{"id":"c71504d1-f14f-4181-a654-730d5855ec48","version":3,"candidates":[{"scheduled_surface_guid": "NEW_TAB_DE_DE", "prospect_id": "447c90d2-1084-5f83-a585-26edfbf5640e", "url": "https://www.spektrum.de/news/ninetyeast-ridge-eines-der-laengsten-gebirge-liegt-tief-unter-dem-meer/2246024", "prospect_source": "QA_ENTERTAINMENT", "save_count": 0, "predicted_topic": "", "rank": 117, "data_source": "prospect", "title": "Eines der l\u00e4ngsten Gebirge liegt tief unter dem Meer", "excerpt": "Die Bergkette wurde durch ein seltenes vulkanisches Ph\u00e4nomen gebildet", "language": "EN", "image_url": "https://static.spektrum.de/fm/912/f1920x1080/triplejunction_gis_2014_lrg.8200272.png", "authors": ["Daniel Lingenh\u00f6hl"]},{"scheduled_surface_guid": "NEW_TAB_DE_DE", "prospect_id": "faa0631f-3a43-555a-9947-7ce3de165a92", "url": "https://www.spiegel.de/ausland/wahlen-in-thailand-wie-eine-kandidatin-fuer-ein-demokratischeres-thailand-kaempft-a-1fa52682-ca7a-45f9-816a-a031ca0a7950", "prospect_source": "QA_ENTERTAINMENT", "save_count": 10, "predicted_topic": "POLITICS", "rank": 118, "data_source": "prospect", "image_url": 16, "excerpt": "Sie vertritt als Anwältin Regimegegner. Nun will Sasinan Thamnitinan sich im Parlament für mehr Demokratie in Thailand einsetzen. Unterwegs im ersten Wahlkampf nach den landesweiten Massenprotesten gegen das Militär.", "language": "BB", "authors": 42}]}}',
        },
      ],
    };

    await processor(fakePayload, sqsContext, sqsCallback);

    // authors, topic, and language are invalid in the test payload above
    // - all should have triggered a Sentry call
    expect(sentrySpy).toHaveBeenCalledTimes(3);

    // the errors in ML-supplied URL metadata should *not* stop the prospects
    // from being inserted!
    expect(captureConsoleSpy).toHaveBeenCalledWith(
      `2 prospects inserted into dynamo.`,
    );
  });
});
