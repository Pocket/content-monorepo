/**
 * Setup to allow tests to run outside docker compose.
 *
 * dotenv will not modify pre-existing environment variables,
 * so this does nothing when running in containers (all already
 * set using content from .docker/local.env).  Overrides to
 * localhost allow interacting with containers without docker
 * networking or modifications to /etc/hosts
 */

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.AWS_S3_ENDPOINT =
    process.env.AWS_S3_ENDPOINT ?? 'http://localhost:4566';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'mysql://root:@localhost:3306/curation_corpus?connect_timeout=300';
  process.env.SNOWPLOW_ENDPOINT =
    process.env.SNOWPLOW_ENDPOINT ?? 'localhost:9090';
  require('dotenv').config({ path: '../../../.docker/local.env' });
};
