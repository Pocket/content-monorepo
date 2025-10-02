import { ML_USERNAME } from 'content-common';

const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
  app: {
    name: 'Corpus-Scheduler-Lambda',
    environment: environment,
    isDev: isDev,
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      release: process.env.GIT_SHA || '',
    },
    // scheduler lambda env, indicates if lambda is allowed to schedule
    allowedToSchedule: process.env.ALLOWED_TO_SCHEDULE || 'true',
    enableScheduledDateValidation:
      process.env.ENABLE_SCHEDULED_DATE_VALIDATION || 'true',
    version: process.env.GIT_SHA || '',
  },
  validation: {
    ISO_SUNDAY: 7, // ISO Sunday is day #7 in the week (note: JS getDay returns 0 for Sunday)
    ISO_MONDAY: 1, // ISO Monday is day #1 in the week
    EN_US: {
      timeZone: 'America/New_York',
      publishHour: 3,
      MON_SAT_MIN_DIFF: 14, // Regular cutoff is 10am. 24:00 - 10:00 = 14 hours
      SUNDAY_MIN_DIFF: 32, // Sunday cutoff is Friday 4pm. 2 days - 16 hours = 32 hours
    },
    // from https://mozilla-hub.atlassian.net/browse/MC-1102?focusedCommentId=891687
    // When daylight savings starts / ends there will be a one hour difference between a delta based specification and a time based specification.
    // Since the scheduler uses the local timezone when producing content, there will be a mismatch and the window would be 1 hour smaller.
    DE_DE: {
      timeZone: 'Europe/Berlin',
      publishHour: 9,
      MONDAY_SUNDAY_MIN_DIFF: 14, // Latest cutoff is 10 am. Shown Monday-Sunday mornings. 24:00 - 10:00 = 14 hours
    },
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.REGION || 'us-east-1',
  },
  AdminApi: isDev
    ? process.env.ADMIN_API_URI || 'https://admin-api.getpocket.dev'
    : process.env.ADMIN_API_URI || 'https://admin-api.getpocket.com',
  jwt: {
    key: process.env.JWT_KEY || 'CorpusSchedulerLambda/Dev/JWT_KEY',
    iss: process.env.JWT_ISS || 'https://getpocket.com',
    aud: process.env.JWT_AUD || 'https://admin-api.getpocket.com/',
    name: 'ML Corpus Scheduler Lambda User',
    userId: ML_USERNAME,
    groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
  },
  snowplow: {
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId: isDev ? 'corpus-scheduler-lambda-dev' : 'corpus-scheduler-lambda',
    // the amount of time the lambda will wait before shutting down. this gives the snowplow
    // emitter, which is not async, a chance to flush its internal cache.
    emitterDelay: 10000,
    schemas: {
      // published 2024-04-23
      scheduled_corpus_candidate:
        'iglu:com.pocket/scheduled_corpus_candidate/jsonschema/1-0-4',
      // published 2024-02-28
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-17',
    },
  },
};

export default config;
