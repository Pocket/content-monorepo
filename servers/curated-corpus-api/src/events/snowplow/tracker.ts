import * as Sentry from '@sentry/node';

import { getEmitter, getTracker } from 'content-common/snowplow';
import config from '../../config';

const emitter = getEmitter((error: object) => {
  Sentry.addBreadcrumb({ message: 'Emitter Data', data: error });
  Sentry.captureMessage(`Emitter Error`);
});

export const tracker = getTracker(emitter, config.snowplow.appId);
