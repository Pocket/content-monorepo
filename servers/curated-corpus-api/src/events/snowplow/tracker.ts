import { getEmitter, getTracker } from 'content-common/events/snowplow';
import config from '../../config';

const emitter = getEmitter();

export const tracker = getTracker(emitter, config.snowplow.appId);
