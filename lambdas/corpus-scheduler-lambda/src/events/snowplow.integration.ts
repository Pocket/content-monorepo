import {
  resetSnowplowEvents,
  waitForSnowplowEvents,
} from 'content-common/snowplow/test-helpers';
import { getEmitter, getTracker } from 'content-common/snowplow';
import { queueSnowplowEvent } from './snowplow';
import {
  SnowplowScheduledCorpusCandidateErrorName,
  SnowplowScheduledCorpusCandidate,
} from './types';
import { random } from 'typia';
import config from '../config';

describe('snowplow', () => {
  const mockCandidate = {
    ...random<SnowplowScheduledCorpusCandidate>(),
    scheduled_corpus_item_external_id: '05706565-5a9c-4b57-83e5-a426485a4714',
    approved_corpus_item_external_id: 'c43a2aa5-28de-4828-a20e-1fdf60cc4a80',
  };
  const emitter = getEmitter();
  const tracker = getTracker(emitter, config.snowplow.appId);

  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should accept an event with a scheduled corpus candidate', async () => {
    //emitter.flush();
    //await new Promise((resolve) => setTimeout(resolve, 1000));

    queueSnowplowEvent(tracker, mockCandidate);

    const allEvents = await waitForSnowplowEvents();

    expect(allEvents.total).toEqual(1);
    expect(allEvents.bad).toEqual(0);
  });

  describe('error events', () => {
    Object.values(SnowplowScheduledCorpusCandidateErrorName).forEach(
      (errorName) => {
        it(`should emit events with ${errorName} error`, async () => {
          queueSnowplowEvent(tracker, {
            ...mockCandidate,
            scheduled_corpus_item_external_id: undefined,
            approved_corpus_item_external_id: undefined,
            error_name: errorName,
            error_description: `Oh no! A ${errorName} error occurred.`,
          });

          //emitter.flush();
          //await new Promise((resolve) => setTimeout(resolve, 1000));

          const allEvents = await waitForSnowplowEvents();

          expect(allEvents.total).toEqual(1);
          expect(allEvents.bad).toEqual(0);
        });
      },
    );
  });
});
