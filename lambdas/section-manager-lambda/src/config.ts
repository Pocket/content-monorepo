const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
  adminApiEndpoint: isDev
    ? process.env.ADMIN_API_URI || 'https://admin-api.getpocket.dev'
    : process.env.ADMIN_API_URI || 'https://admin-api.getpocket.com',
  app: {
    name: 'Section-Manager-Lambda',
    environment: environment,
    isDev: isDev,
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      release: process.env.GIT_SHA || '',
    },
    version: process.env.GIT_SHA || '',
  },
  aws: {
    localEndpoint: process.env.AWS_ENDPOINT,
    region: process.env.REGION || 'us-east-1',
  },
  jwt: {
    key: process.env.JWT_KEY || 'SectionManagerLambda/Dev/JWT_KEY',
    iss: process.env.JWT_ISS || 'https://getpocket.com',
    aud: process.env.JWT_AUD || 'https://admin-api.getpocket.com/',
    name: 'ML Section Manager Lambda User',
    userId: 'ML',
    groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
  },
};

export default config;
