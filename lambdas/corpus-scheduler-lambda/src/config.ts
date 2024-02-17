const environment = process.env.ENVIRONMENT || 'development';
const isDev = environment === 'development';

const config = {
    app: {
        name: 'Corpus-Scheduler-Lambda',
        environment: environment,
        sentry: {
            dsn: process.env.SENTRY_DSN || 'https://4a07d864f9014dac78bae8adfe5e137b@o28549.ingest.sentry.io/4506712835620864',
            release: process.env.GIT_SHA || '',
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
        name: 'Corpus Scheduler Lambda User',
        userId: 'corpus-scheduler-lambda-user',
        groups: ['mozilliansorg_pocket_scheduled_surface_curator_full'],
    },
};

export default config;
