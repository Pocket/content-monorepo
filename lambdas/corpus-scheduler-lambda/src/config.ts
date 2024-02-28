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
    aws: {
        localEndpoint: process.env.AWS_ENDPOINT,
        region: process.env.REGION || 'us-east-1',
    },
    AdminApi: isDev
        ? process.env.ADMIN_API_URI || 'http://localhost:4027'
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
