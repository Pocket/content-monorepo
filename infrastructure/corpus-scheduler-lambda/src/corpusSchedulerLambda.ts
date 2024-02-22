import { Construct } from 'constructs';
import { config } from './config';
import {
  LAMBDA_RUNTIMES,
  PocketSQSWithLambdaTarget,
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';

export class CorpusSchedulerSQSLambda extends Construct {
  constructor(
    scope: Construct,
    private name: string,
    private vpc: PocketVPC,
  ) {
    super(scope, name);

    new PocketSQSWithLambdaTarget(this, 'corpus-scheduler-sqs-lambda', {
      name: `${config.prefix}-SQS`,
      // set batchSize to something reasonable
      batchSize: 20,
      batchWindow: 60,
      sqsQueue: {
        visibilityTimeoutSeconds: 150,
        maxReceiveCount: 3,
      },
      lambda: {
        runtime: LAMBDA_RUNTIMES.NODEJS20,
        handler: 'index.handler',
        timeout: 120,
        memorySizeInMb: 512,
        reservedConcurrencyLimit: 1,
        environment: {
          REGION: this.vpc.region,
          SENTRY_DSN: this.getSentryDsn(),
          GIT_SHA: this.getGitSha(),
          JWT_KEY: `${config.name}/${config.environment}/JWT_KEY`,
          ENVIRONMENT:
            config.environment === 'Prod' ? 'production' : 'development',
        },
        vpcConfig: {
          securityGroupIds: this.vpc.defaultSecurityGroups.ids,
          subnetIds: this.vpc.privateSubnetIds,
        },
        codeDeploy: {
          region: this.vpc.region,
          accountId: this.vpc.accountId,
        },
        executionPolicyStatements: [
          {
            actions: ['secretsmanager:GetSecretValue', 'kms:Decrypt'],
            resources: [
              `arn:aws:secretsmanager:${this.vpc.region}:${this.vpc.accountId}:secret:${config.name}/${config.environment}`,
              `arn:aws:secretsmanager:${this.vpc.region}:${this.vpc.accountId}:secret:${config.name}/${config.environment}/*`,
            ],
          },
        ],
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
