import { getUnleash } from '@pocket-tools/feature-flags-client';
import type { Unleash } from '@pocket-tools/feature-flags-client';

import config from './config';

let _unleash: Unleash;

export function unleash(): Unleash {
  if (_unleash != null) return _unleash;
  _unleash = getUnleash({
    url: config.unleash.endpoint,
    appName: config.app.serviceName,
    customHeaders: { Authorization: config.unleash.clientKey },
    timeout: config.unleash.timeout,
    refreshInterval: config.unleash.refreshInterval,
  });
  return _unleash;
}
