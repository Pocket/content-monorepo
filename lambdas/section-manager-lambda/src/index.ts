import * as Sentry from '@sentry/serverless';

import { SQSEvent, SQSHandler } from 'aws-lambda';

import { SqsSectionWithSectionItems } from './types';
import { validateSqsData } from './validators';

import config from './config';

Sentry.AWSLambda.init({
  dsn: config.app.sentry.dsn,
  release: config.app.sentry.release,
  environment: config.app.environment,
  serverName: config.app.name,
});

/**
 * @param event data from an SQS message - should be an array of items to create / schedule in corpus
 * @exception Error Raises an exception on error, which causes the batch to be retried.
 *  Lambda batchSize is 1 to avoid retrying successfully processed records.
 */
export const processor: SQSHandler = async (event: SQSEvent) => {
  console.log('Section Manager Lambda invoked...');

  // due to SQS message size limit of 256kb, this lambda is expected to process
  // one Section per SQS message

  // make sure only one record was passed in
  if (event.Records.length > 1) {
    Sentry.captureException(
      `expected 1 record in SQS message, received ${event.Records.length}`,
    );

    return;
  }

  // validate structure of record
  const sqsSectionData: SqsSectionWithSectionItems = JSON.parse(
    event.Records[0].body,
  );

  validateSqsData(sqsSectionData);

  // get the JWT bearer token for making graph API calls
  /*
  const jwtConfig: JwtConfig = {
    aud: config.jwt.aud,
    groups: config.jwt.groups,
    iss: config.jwt.iss,
    name: config.jwt.name,
    userId: config.jwt.userId,
  };

  const bearerToken = getJwtBearerToken(jwtConfig, config.jwt.key);
  */

  // call createOrUpdate mutation for the section

  // for each SectionItem, see if the URL already exists in the corpus

  // if not, create the corpus item

  //    get metadata from the parser

  //    using parser metadata, create an ApprovedItem in the Corpus

  // else if URL exists in the corpus

  //    call mutation to create a new SectionItem
};

// the actual function has to be wrapped in order for sentry to work
export const handler = Sentry.AWSLambda.wrapHandler(processor);
