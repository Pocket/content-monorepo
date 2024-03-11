import { SnowplowScheduledCorpusCandidate } from './types';
import {
  getGoodSnowplowEvents,
  parseSnowplowData,
} from 'content-common/snowplow/test-helpers';

/**
 * @return scheduled_corpus_candidate entity from the last good event sent to Snowplow Micro.
 */
export async function extractScheduledCandidateEntity(): Promise<SnowplowScheduledCorpusCandidate> {
  const goodEvents = await getGoodSnowplowEvents();
  const snowplowContext = parseSnowplowData(
    goodEvents[0].rawEvent.parameters.cx,
  );
  return snowplowContext.data[0].data as SnowplowScheduledCorpusCandidate;
}
