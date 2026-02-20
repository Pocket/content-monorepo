// this file is injected into the snowplow data pipeline to discard events
// coming from legacy pocket applications, specifically mobile clients that
// remain installed on user devices.

// https://docs.snowplow.io/docs/pipeline/enrichments/available-enrichments/custom-javascript-enrichment/writing/#discarding-the-event

// these are the only app_id values we want to collect events from
const validAppIds = [
  'pocket-backend-prospect-api',
  'pocket-backend-prospect-api-dev',
  'pocket-backend-curated-corpus-api',
  'pocket-backend-curated-corpus-api-dev',
  'pocket-prospect-translation-lambda',
  'pocket-prospect-translation-lambda-dev',
  'corpus-scheduler-lambda',
  'corpus-scheduler-lambda-dev',
];

// this function must be named `process`
function process(event) {
  // every event will have an app_id
  const appId = event.getApp_id();

  if (validAppIds.indexOf(appId) < 0) {
    // drop the event instead of throwing an error, as
    // throwing incurs a cost via kinesis stream volume.
    // dropping results in neither good nor bad events -
    // the events are dropped and irrevocably gone.
    event.drop();
  }
}
