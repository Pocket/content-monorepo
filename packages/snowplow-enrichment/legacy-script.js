/*
This script is being saved here for posterity before being replaced with
script.js in this same folder.

This script was disabled in the prod Snowplow pipeline - it appears to have
been a test that was never fully implemented.

The purpose was to add a Pocket Parser item_id to the URL included in the
Snowplow event.
*/

/**
 * The Snowplow JS is not really JS. We don't have access to normal JS functions. It runs the Nashorn Engine.
 * So we create our own Fetch, and URL Encode functions out of it that call Java
 */

var URLEncoder = Java.type('java.net.URLEncoder');
var StandardCharsets = Java.type('java.nio.charset.StandardCharsets');

function encodeURIComponent(str) {
  return URLEncoder.encode(str, StandardCharsets.UTF_8.toString());
}

var fetch = function (url, options) {
  options = options || {};
  var method = options.method || 'GET';
  var headers = options.headers || {};
  var body = options.body || null;

  var javaUrl = new java.net.URL(url);
  var connection = javaUrl.openConnection();

  connection.setRequestMethod(method);

  // Set headers
  for (var key in headers) {
    if (headers.hasOwnProperty(key)) {
      connection.setRequestProperty(key, headers[key]);
    }
  }

  if (method === 'POST' || method === 'PUT') {
    connection.setDoOutput(true);
    var outputStream = connection.getOutputStream();
    outputStream.write(body.getBytes('UTF-8'));
    outputStream.close();
  }

  var responseCode = connection.getResponseCode();
  var inputStream =
    responseCode >= 200 && responseCode < 300
      ? connection.getInputStream()
      : connection.getErrorStream();
  var reader = new java.io.BufferedReader(
    new java.io.InputStreamReader(inputStream),
  );
  var inputLine;
  var response = new java.lang.StringBuffer();

  while ((inputLine = reader.readLine()) != null) {
    response.append(inputLine);
  }
  reader.close();

  return {
    status: responseCode,
    text: function () {
      return response.toString();
    },
    json: function () {
      return JSON.parse(response.toString());
    },
  };
};

/**
 *  To test, run the following from within the snowplow_enrichments folder, point web-client at the local snowplow instance and trigger content events.
 *  Monitor the event stream in localhost:9090/micro/ui
 *
 *  `docker run -p 9090:9090 --mount type=bind,source=$(pwd)/triggerParser.js,destination=/config/enrichments/script.js pocket/snowplow-micro`
 */

/**
 * For any event with a content entity, this will ping the parser to ensure a "item" event is triggered for our content model
 * @param {*} event
 */
function process(event) {
  const entities = JSON.parse(event.getContexts());

  if (entities) {
    // loop through the entities
    for (const entity of entities.data) {
      if (entity.schema.startsWith('iglu:com.pocket/content/jsonschema')) {
        // work with the entity
        const url = entity.data.url;
        const itemId = entity.data.item_id;

        try {
          // try catch this whjole thing, because we dont want this to "fail" events if the parser is slow or otherwise down
          const response = fetch(
            `https://text.getpocket.com/v3beta/wrapper?noArticle=1&createIfNone=1&url=${encodeURIComponent(
              url,
            )}`,
          );

          if (response.status == 200) {
            const parsedResponse = response.json();
            if (
              parsedResponse !== null &&
              parsedResponse.item_id &&
              itemId == null
            ) {
              entity.data.item_id = parsedResponse.item_id;
            }
          }
        } catch (error) {
          // no-op
        }
      }
    }
    // pack the entities back
    event.setContexts(JSON.stringify(entities));
  }
}
