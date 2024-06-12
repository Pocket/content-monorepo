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
      timeZone: 'America/Los_Angeles',
      MON_SAT_MIN_DIFF: 14, // Regular cutoff is 10am. 24:00 - 10:00 = 14 hours
      SUNDAY_MIN_DIFF: 32, // Sunday cutoff is Friday 4pm. 2 days - 16 hours = 32 hours
    },
    DE_DE: {
      timeZone: 'Europe/Berlin',
      SUNDAY_MONDAY_MIN_DIFF: 12, // Latest cutoff is noon (12 pm). Shown Saturday & Sunday afternoons. 24:00 - 12:00 = 12 hours
      TUESDAY_SATURDAY_MIN_DIFF: 14, // Latest cutoff is 10 am. Shown Monday-Friday mornings. 24:00 - 10:00 = 14 hours
    }
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
    userId: 'ML',
    groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
  },
  snowplow: {
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId: isDev ? 'corpus-scheduler-lambda-dev' : 'corpus-scheduler-lambda',
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
