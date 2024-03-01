import {
  ReviewedCorpusItemEventType,
  ScheduledCorpusItemEventType,
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

// Work out the Snowplow HTTP protocol.
const snowplowHttpProtocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';

// Environment variables below are set in .aws/src/main.ts
export default {
  app: {
    port: 4025,
    environment: process.env.NODE_ENV || 'development',
    defaultMaxAge: 86400,
    pagination: {
      approvedItemsPerPage: 30,
      rejectedItemsPerPage: 30,
      maxAllowedResults: 100,
      scheduledSurfaceHistory: 10,
    },
    removeReasonMaxLength: 100,
    upload: {
      maxSize: 10000000, // in bytes => 10MB
      maxFiles: 10,
    },
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: localEndpoint,
    s3: {
      localEndpoint,
      bucket,
      path: s3path,
    },
    eventBus: {
      name: process.env.EVENT_BUS_NAME || 'default',
    },
  },
  events: {
    source: 'curated-corpus-api',
    version: '0.0.2',
  },
  eventBridge: {
    addScheduledItemEventType: 'add-scheduled-item',
    removeScheduledItemEventType: 'remove-scheduled-item',
    updateScheduledItemEventType: 'update-scheduled-item',
    updateApprovedItemEventType: 'update-approved-item',
    source: 'curation-migration-datasync',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
    includeLocalVariables: true,
  },
  snowplow: {
    appId: 'pocket-backend-curated-corpus-api',
    corpusItemEvents: ReviewedCorpusItemEventType,
    corpusScheduleEvents: ScheduledCorpusItemEventType,
    schemas: {
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-5',
      reviewedCorpusItem:
        'iglu:com.pocket/reviewed_corpus_item/jsonschema/1-0-6',
      scheduledCorpusItem:
        'iglu:com.pocket/scheduled_corpus_item/jsonschema/1-0-4',
    },
  },
};
