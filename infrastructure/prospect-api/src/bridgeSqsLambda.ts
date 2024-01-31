import { Construct } from 'constructs';
import { config } from './config';
import { ApplicationSQSQueue, ApplicationSQSQueueProps, PocketVPC } from '@pocket-tools/terraform-modules';
import { PocketSQSWithLambdaTarget } from '@pocket-tools/terraform-modules';
import { LAMBDA_RUNTIMES } from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamUserPolicyAttachment } from '@cdktf/provider-aws/lib/iam-user-policy-attachment';
import { IamUser } from '@cdktf/provider-aws/lib/iam-user';

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
        runtime: LAMBDA_RUNTIMES.NODEJS18,
        handler: 'index.handler',
        timeout: 120,
        memorySizeInMb: 512,
        reservedConcurrencyLimit: 1,
        executionPolicyStatements: [
          {
            actions: ['events:PutEvents'],
            resources: [
              `arn:aws:events:${region.name}:${caller.accountId}:event-bus/${config.envVars.eventBusName}`,
            ],
            effect: 'Allow',
          },
        ],
        environment: {
          EVENT_BRIDGE_BUS_NAME: config.envVars.eventBusName,
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
      // TODO: Is this the right name? Use IAM prefix or not?
      name: `IAM-${config.prefix}-LambdaSQSPolicy`,
      policy: new DataAwsIamPolicyDocument(this, `iam_sqs_policy`, {
        statement: [
          {
            effect: 'Allow',
            actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
            resources: [sqsLambda.sqsQueueResource.arn],
          },
        ],
      }).json,
      // provider: config.provider,
      tags: config.tags,
    });

    const iamUser = new IamUser(this, 'iam_user', {
      name: `${config.prefix}-Queue-User`,
      tags: config.tags,
      // provider: this.config.provider,
      permissionsBoundary: iamUserPolicy.arn,
    });

    new IamUserPolicyAttachment(this, 'iam-sqs-user-policy-attachment', {
      // provider: this.config.provider,
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
