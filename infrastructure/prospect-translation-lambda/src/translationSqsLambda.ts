import { Construct } from 'constructs';
import { config } from './config';
import {
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { PocketSQSWithLambdaTarget } from '@pocket-tools/terraform-modules';
import { LAMBDA_RUNTIMES } from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';
import {DataAwsCallerIdentity} from "@cdktf/provider-aws/lib/data-aws-caller-identity";
import {DataAwsRegion} from "@cdktf/provider-aws/lib/data-aws-region";

export class TranslationSqsLambda extends Construct {
  constructor(
    scope: Construct,
    private name: string,
    caller: DataAwsCallerIdentity,
    region: DataAwsRegion
  ) {
    super(scope, name);

    const vpc = new PocketVPC(this, 'pocket-shared-vpc');

    const { sentryDsn, gitSha } = this.getEnvVariableValues();

    new PocketSQSWithLambdaTarget(this, 'translation-sqs-lambda', {
      name: `${config.prefix}-Sqs-Translation`,
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
            effect: 'Allow',
            actions: [
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:DescribeTable',
              'dynamodb:UpdateItem',
              'dynamodb:Query',
            ],
            resources: [
              `arn:aws:dynamodb:${region.name}:${caller.accountId}:table/${config.shortName}-${config.environment}-Prospects`,
              `arn:aws:dynamodb:${region.name}:${caller.accountId}:table/${config.shortName}-${config.environment}-Prospects/*`,
            ],
          },
        ],
        environment: {
          PROSPECT_API_PROSPECTS_TABLE: `${config.shortName}-${config.environment}-Prospects`,
          SENTRY_DSN: sentryDsn,
          GIT_SHA: gitSha,
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
      },
      tags: config.tags,
    });
  }

  private getEnvVariableValues() {
    const sentryDsn = new DataAwsSsmParameter(this, 'sentry-dsn', {
      name: `/${config.name}-Sqs-Translation/${config.environment}/SENTRY_DSN`,
    });

    const serviceHash = new DataAwsSsmParameter(this, 'service-hash', {
      name: `${config.circleCIPrefix}/SERVICE_HASH`,
    });

    return { sentryDsn: sentryDsn.value, gitSha: serviceHash.value };
  }
}
