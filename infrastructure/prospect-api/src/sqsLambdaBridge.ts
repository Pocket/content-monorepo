import { Construct } from 'constructs';
import { config } from './config';
import { PocketVPC } from '@pocket-tools/terraform-modules';
import { PocketSQSWithLambdaTarget } from '@pocket-tools/terraform-modules';
import { LAMBDA_RUNTIMES } from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';

export class SqsLambdaBridge extends Construct {
  constructor(
    scope: Construct,
    private name: string,
  ) {
    super(scope, name);

    const vpc = new PocketVPC(this, 'pocket-shared-vpc');

    new PocketSQSWithLambdaTarget(this, 'bridge-sqs-lambda', {
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
        executionPolicyStatements: [],
        environment: {
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
