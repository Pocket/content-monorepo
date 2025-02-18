import * as Sentry from '@sentry/serverless';
import { Callback, Context, SQSEvent } from 'aws-lambda';

import { processor } from './index';
import { createSqsSectionWithSectionItems } from './testHelpers';
import * as Jwt from './jwt';
import * as Utils from './utils';
import * as Validators from './validators';

describe('processor', () => {
  // mock functions that are possibly called from entry function
  const mockGetJwtBearerToken = jest
    .spyOn(Jwt, 'getJwtBearerToken')
    .mockResolvedValue('jwtToken');

  const mockProcessSqsSectionData = jest
    .spyOn(Utils, 'processSqsSectionData')
    .mockResolvedValue();

  const mockSentryCaptureException = jest
    .spyOn(Sentry, 'captureException')
    .mockImplementation();

  const mockValidateSqsData = jest
    .spyOn(Validators, 'validateSqsData')
    .mockReturnValue();

  // needed to match call signature to entry function
  const sqsCallback = null as unknown as Callback;
  const sqsContext = null as unknown as Context;

  afterEach(() => {
    // clear all information/history about mocked functions
    jest.clearAllMocks();
  });

  afterAll(() => {
    // restore original implementation of mocked functions
    jest.restoreAllMocks();
  });

  it('should call processing functions if SQS message has only one record', async () => {
    // create a valid payload
    const payload = createSqsSectionWithSectionItems();

    // create an SQS event using the valid payload
    const sqsEvent = {
      Records: [
        {
          messageId: '1',
          body: JSON.stringify(payload),
        },
      ],
    } as any as SQSEvent;

    // initiate the lambda entry function
    await processor(sqsEvent, sqsContext, sqsCallback);

    expect(mockValidateSqsData).toHaveBeenCalledTimes(1);
    expect(mockGetJwtBearerToken).toHaveBeenCalledTimes(1);
    expect(mockProcessSqsSectionData).toHaveBeenCalledTimes(1);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it('should call sentry and no processing functions if SQS message has more than one record', async () => {
    // create two valid payloads
    const payload1 = createSqsSectionWithSectionItems();
    const payload2 = createSqsSectionWithSectionItems();

    // create an invalid SQS event with two records
    const sqsEvent = {
      Records: [
        {
          messageId: '1',
          body: JSON.stringify(payload1),
        },
        {
          messageId: '2',
          body: JSON.stringify(payload2),
        },
      ],
    } as any as SQSEvent;

    // initiate the lambda entry function
    await processor(sqsEvent, sqsContext, sqsCallback);

    expect(mockValidateSqsData).toHaveBeenCalledTimes(0);
    expect(mockGetJwtBearerToken).toHaveBeenCalledTimes(0);
    expect(mockProcessSqsSectionData).toHaveBeenCalledTimes(0);
    expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      `expected 1 record in SQS message, received ${sqsEvent.Records.length}`,
    );
  });
});
