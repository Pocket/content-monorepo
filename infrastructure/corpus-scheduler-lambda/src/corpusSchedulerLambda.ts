import { Construct } from 'constructs';
import { config } from './config';
import {
  LAMBDA_RUNTIMES,
  PocketSQSWithLambdaTarget,
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';
import { SqsQueue } from '@cdktf/provider-aws/lib/sqs-queue';
import { DataAwsSqsQueue } from '@cdktf/provider-aws/lib/data-aws-sqs-queue';

export class CorpusSchedulerSQSLambda extends Construct {
  public readonly sqsQueue: SqsQueue | DataAwsSqsQueue;

  constructor(
    scope: Construct,
    private name: string,
    private vpc: PocketVPC,
  ) {
    super(scope, name);

    const pocketSqsLambda = new PocketSQSWithLambdaTarget(
      this,
      'corpus-scheduler-sqs-lambda',
      {
        name: `${config.prefix}-SQS`,
        // batch size is 1 so SQS doesn't get smart and try to combine them
        // (a combined message will mean a skipped candidate set from ML)
        batchSize: 1,
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
            ALLOWED_TO_SCHEDULE: this.getAllowedToSchedule(),
            ENABLE_SCHEDULED_DATE_VALIDATION: this.getEnableScheduledDateValidation(),
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
      },
    );

    this.sqsQueue = pocketSqsLambda.sqsQueueResource;
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

  private getAllowedToSchedule() {
    const allowedToSchedule = new DataAwsSsmParameter(this, 'allowed-to-schedule', {
      name: `/${config.name}/${config.environment}/ALLOWED_TO_SCHEDULE`,
    });

    return allowedToSchedule.value;
  }

  private getEnableScheduledDateValidation() {
    const enableScheduledDateValidation = new DataAwsSsmParameter(this, 'enable-scheduled-date-validation', {
      name: `/${config.name}/${config.environment}/ENABLE_SCHEDULED_DATE_VALIDATION`,
    });

    return enableScheduledDateValidation.value;
  }
}
