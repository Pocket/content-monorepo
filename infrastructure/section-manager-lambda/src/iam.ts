import { Construct } from 'constructs';
import { config } from './config';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamUserPolicyAttachment } from '@cdktf/provider-aws/lib/iam-user-policy-attachment';
import { SqsQueue } from '@cdktf/provider-aws/lib/sqs-queue';
import { DataAwsSqsQueue } from '@cdktf/provider-aws/lib/data-aws-sqs-queue';

export class MlIamUserPolicy extends Construct {
  constructor(
    scope: Construct,
    name: string,
    sqsQueue: SqsQueue | DataAwsSqsQueue,
  ) {
    super(scope, name);

    // TODO: This should ideally be a shared IAM user called something like 'Content-ML-User'.
    //  I scheduled a meeting to brainstorm how we might create shared infrastructure in this repo.
    const iamUserName = `ProspectAPI-${config.environment}-Queue-User`;

    const iamUserPolicy = new IamPolicy(this, 'iam-sqs-policy', {
      name: `IAM-${config.prefix}-QueuePolicy`,
      policy: new DataAwsIamPolicyDocument(this, `iam_sqs_policy`, {
        statement: [
          {
            effect: 'Allow',
            actions: [
              'sqs:SendMessage',
              'sqs:GetQueueAttributes',
              'sqs:GetQueueUrl',
            ],
            resources: [sqsQueue.arn],
          },
        ],
      }).json,
      tags: config.tags,
    });

    new IamUserPolicyAttachment(this, 'iam-sqs-user-policy-attachment', {
      policyArn: iamUserPolicy.arn,
      user: iamUserName,
    });
  }
}
