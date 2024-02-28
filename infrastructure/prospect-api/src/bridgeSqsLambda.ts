import { Construct } from 'constructs';
import { config } from './config';
import {
  LAMBDA_RUNTIMES,
  PocketSQSWithLambdaTarget,
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamUserPolicyAttachment } from '@cdktf/provider-aws/lib/iam-user-policy-attachment';
import { IamUser } from '@cdktf/provider-aws/lib/iam-user';
import { DataAwsKinesisFirehoseDeliveryStream } from '@cdktf/provider-aws/lib/data-aws-kinesis-firehose-delivery-stream';

export class BridgeSqsLambda extends Construct {
  constructor(
    scope: Construct,
    private name: string,
    dependencies: {
      region: DataAwsRegion;
      caller: DataAwsCallerIdentity;
    },
  ) {
    super(scope, name);

    const { region, caller } = dependencies;
    const vpc = new PocketVPC(this, 'pocket-shared-vpc');

    const eventBridgeArn = `arn:aws:events:${region.name}:${caller.accountId}:event-bus/${config.envVars.eventBusName}`;

    const metaflowFirehose = new DataAwsKinesisFirehoseDeliveryStream(
      this,
      'metaflow-firehose',
      { name: config.envVars.metaflowFirehoseName },
    );

    const sqsLambda = new PocketSQSWithLambdaTarget(this, 'bridge-sqs-lambda', {
      name: `${config.prefix}-Sqs-Bridge`,
      // batch size is 1 so SQS doesn't get smart and try to combine them
      // (a combined message will mean a skipped candidate set from ML)
      batchSize: 1,
      batchWindow: 60,
      sqsQueue: {
        maxReceiveCount: 3,
        visibilityTimeoutSeconds: 300,
      },
      lambda: {
        runtime: LAMBDA_RUNTIMES.NODEJS20,
        handler: 'index.handler',
        timeout: 120,
        memorySizeInMb: 512,
        reservedConcurrencyLimit: 1,
        executionPolicyStatements: [
          {
            actions: ['events:PutEvents'],
            resources: [eventBridgeArn],
            effect: 'Allow',
          },
          {
            actions: ['firehose:PutRecord'],
            resources: [metaflowFirehose.arn],
            effect: 'Allow',
          },
        ],
        environment: {
          EVENT_BRIDGE_BUS_NAME: config.envVars.eventBusName,
          EVENT_BRIDGE_DETAIL_TYPE: config.envVars.eventDetailType,
          METAFLOW_FIREHOSE_NAME: config.envVars.metaflowFirehoseName,
          SENTRY_DSN: this.getSentryDsn(),
          GIT_SHA: this.getGitSha(),
          ENVIRONMENT:
            config.environment === 'Prod' ? 'production' : 'development',
        },
        vpcConfig: {
          securityGroupIds: vpc.internalSecurityGroups.ids,
          subnetIds: vpc.privateSubnetIds,
        },
        codeDeploy: {
          region: vpc.region,
          accountId: vpc.accountId,
        },
        alarms: {
          // We don't configure alarms for this lambda, and
          // instead rely on Sentry to alert on failure.
        },
      },
      tags: config.tags,
    });

    const iamUserPolicy = new IamPolicy(this, 'iam-sqs-policy', {
      name: `IAM-${config.prefix}-QueuePolicy`,
      policy: new DataAwsIamPolicyDocument(this, `iam_sqs_policy`, {
        statement: [
          {
            effect: 'Allow',
            actions: ['events:PutEvents'],
            resources: [eventBridgeArn],
            condition: [
              // The shared EventBridge processes many types of events. Only allow prospect messages to be sent.
              {
                test: 'StringEquals',
                variable: 'events:detail-type',
                values: [config.envVars.eventDetailType],
              },
            ],
          },
          {
            effect: 'Allow',
            actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
            resources: [sqsLambda.sqsQueueResource.arn],
          },
        ],
      }).json,
      tags: config.tags,
    });

    const iamUser = new IamUser(this, 'iam_user', {
      name: `${config.prefix}-Queue-User`,
      tags: config.tags,
    });

    new IamUserPolicyAttachment(this, 'iam-sqs-user-policy-attachment', {
      policyArn: iamUserPolicy.arn,
      user: iamUser.name,
    });
  }

  private getSentryDsn() {
    const sentryDsn = new DataAwsSsmParameter(this, 'sentry-dsn', {
      name: `/${config.name}/${config.environment}/SENTRY_DSN`,
    });

    return sentryDsn.value;
  }

  private getGitSha() {
    const serviceHash = new DataAwsSsmParameter(this, 'service-hash', {
      name: `${config.circleCIPrefix}/SERVICE_HASH`,
    });

    return serviceHash.value;
  }
}
