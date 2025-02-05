import { assert } from 'typia';

import { SqsSectionWithSectionItems } from './types';

/**
 * ensures data coming in via SQS satisfies the required structure and values
 * @param sqsData
 */
export const validateSqsData = (sqsData: any): void => {
  assert<SqsSectionWithSectionItems>(sqsData);
};
