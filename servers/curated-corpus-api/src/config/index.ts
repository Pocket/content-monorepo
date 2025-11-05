import {
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
  SectionEventType,
  SectionItemEventType,
} from '../events/types';

// Work out the AWS/localstack endpoint
const awsEnvironments = ['production', 'development'];
let localEndpoint;
let s3path;

const bucket = process.env.AWS_S3_BUCKET || 'curated-corpus-api-local-images';

if (!awsEnvironments.includes(process.env.NODE_ENV ?? '')) {
  localEndpoint = process.env.AWS_S3_ENDPOINT || 'http://localhost:4566';
  s3path = `${localEndpoint}/${bucket}/`;
} else {
  s3path = `https://${bucket}.s3.amazonaws.com/`;
}

// Environment variables below are set in .aws/src/main.ts
export default {
  app: {
    defaultMaxAge: 86400,
    environment: process.env.NODE_ENV || 'development',
    pagination: {
      approvedItemsPerPage: 30,
      rejectedItemsPerPage: 30,
      maxAllowedResults: 100,
      scheduledSurfaceHistory: 10,
    },
    port: 4025,
    removeReasonMaxLength: 100,
    serviceName: 'curated-corpus-api',
    upload: {
      maxSize: 10000000, // in bytes => 10MB
      maxFiles: 10,
    },
  },
  aws: {
    endpoint: localEndpoint,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      localEndpoint,
      bucket,
      path: s3path,
    },
  },
  events: {
    source: 'curated-corpus-api',
    version: '0.0.2',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    includeLocalVariables: true,
    release: process.env.GIT_SHA || '',
  },
  snowplow: {
    // appId should end in '-dev' outside of production such that Dbt can filter events:
    // https://github.com/Pocket/dbt-snowflake/blob/main/macros/validate_snowplow_app_id.sql
    appId:
      process.env.NODE_ENV === 'production'
        ? 'pocket-backend-curated-corpus-api'
        : 'pocket-backend-curated-corpus-api-dev',
    corpusItemEvents: ReviewedCorpusItemEventType,
    corpusScheduleEvents: ScheduledCorpusItemEventType,
    sectionEvents: SectionEventType,
    sectionItemEvents: SectionItemEventType,
    schemas: {
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-17',
      reviewedCorpusItem:
        'iglu:com.pocket/reviewed_corpus_item/jsonschema/1-0-11',
      scheduledCorpusItem:
        'iglu:com.pocket/scheduled_corpus_item/jsonschema/1-0-8',
      section: 'iglu:com.pocket/section/jsonschema/1-0-0',
      sectionItem: 'iglu:com.pocket/section_item/jsonschema/1-0-0',
    },
  },
  tracing: {
    flagName: 'perm.content.tracing.curated-corpus-api',
    release: process.env.GIT_SHA || 'local',
    serviceName: 'curated-corpus-api',
    url: process.env.OTLP_COLLECTOR_URL || 'http://localhost:4318',
  },
  unleash: {
    clientKey: process.env.UNLEASH_KEY || 'unleash-key-fake',
    endpoint: process.env.UNLEASH_ENDPOINT || 'http://localhost:4242/api',
    refreshInterval: 60 * 1000, // ms
    timeout: 2 * 1000, // ms
  },
};
