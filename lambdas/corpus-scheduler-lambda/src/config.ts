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
  },
  validation: {
    timeZone: 'America/Los_Angeles',
    ISO_SUNDAY: 7, // ISO sunday is day #7 in the week (note: JS getDay returns 0 for Sunday)
    MON_SAT_MIN_DIFF: 14, // Regular cutoff is 10am. 24:00 - 10:00 = 14 hours
    SUNDAY_MIN_DIFF: 32, // Sunday cutoff is Friday 4pm. 2 days - 16 hours = 32 hours
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
};

export default config;
