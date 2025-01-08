import { Construct } from 'constructs';
import {
  App,
  TerraformStack,
  MigrateIds,
  Aspects,
  S3Backend,
} from 'cdktf';

import {
  PocketALBApplication,
  PocketPagerDuty,
  PocketVPC,
} from '@pocket-tools/terraform-modules';

import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { DataAwsSnsTopic } from '@cdktf/provider-aws/lib/data-aws-sns-topic';
import { DataAwsKmsAlias } from '@cdktf/provider-aws/lib/data-aws-kms-alias';
import { CloudwatchLogGroup } from '@cdktf/provider-aws/lib/cloudwatch-log-group';

import { config } from './config';
import { DynamoDB } from 'infrastructure-common';
import { IamUser } from '@cdktf/provider-aws/lib/iam-user';

class ProspectAPI extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: 'us-east-1',
      defaultTags: [{ tags: config.tags }],
    });

    new PagerdutyProvider(this, 'pagerduty_provider', { token: undefined });
    new NullProvider(this, 'null-provider');
    new LocalProvider(this, 'local-provider');
    new ArchiveProvider(this, 'archive-provider');

    new S3Backend(this, {
      bucket: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      dynamodbTable: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      key: config.name,
      region: 'us-east-1',
    });

    new PocketVPC(this, 'pocket-vpc');
    const region = new DataAwsRegion(this, 'region');
    const caller = new DataAwsCallerIdentity(this, 'caller');
    const dynamodb = new DynamoDB(
      this,
      'dynamodb',
      `${config.shortName}-${config.environment}`,
      config.tags,
    );

    new IamUser(this, 'iam_user', {
      name: `${config.prefix}-Queue-User`,
      tags: config.tags,
    });

    this.createPocketAlbApplication({
      s3: this.createS3Bucket(),
      pagerDuty: this.createPagerDuty(),
      secretsManagerKmsAlias: this.getSecretsManagerKmsAlias(),
      snsTopic: this.getCodeDeploySnsTopic(),
      region,
      caller,
      dynamodb,
    });

    // Pre cdktf 0.17 ids were generated differently so we need to apply a migration aspect
    // https://developer.hashicorp.com/terraform/cdktf/concepts/aspects
    Aspects.of(this).add(new MigrateIds());
  }

  /**
   * Create S3 bucket for image uploads
   * @private
   */
  private createS3Bucket() {
    return new S3Bucket(this, 'image-uploads', {
      bucket: `pocket-${config.prefix.toLowerCase()}-images`,
    });
  }

  /**
   * Get the sns topic for code deploy
   * @private
   */
  private getCodeDeploySnsTopic() {
    return new DataAwsSnsTopic(this, 'backend_notifications', {
      name: `Backend-${config.environment}-ChatBot`,
    });
  }

  /**
   * Get secrets manager kms alias
   * @private
   */
  private getSecretsManagerKmsAlias() {
    return new DataAwsKmsAlias(this, 'kms_alias', {
      name: 'alias/aws/secretsmanager',
    });
  }

  /**
   * Create PagerDuty service for alerts
   * @private
   */
  private createPagerDuty() {
    return new PocketPagerDuty(this, 'pagerduty', {
      prefix: config.prefix,
      service: {
        // This is a Tier 2 service and as such only raises non-critical alarms.
        criticalEscalationPolicyId: "PXOQVEP",
        nonCriticalEscalationPolicyId: "PXOQVEP",
      },
    });
  }

  private createPocketAlbApplication(dependencies: {
    s3: S3Bucket;
    pagerDuty: PocketPagerDuty;
    region: DataAwsRegion;
    caller: DataAwsCallerIdentity;
    secretsManagerKmsAlias: DataAwsKmsAlias;
    snsTopic: DataAwsSnsTopic;
    dynamodb: DynamoDB;
  }): PocketALBApplication {
    const { s3, region, caller, secretsManagerKmsAlias, snsTopic, dynamodb } =
      dependencies;

    return new PocketALBApplication(this, 'application', {
      internal: true,
      prefix: config.prefix,
      alb6CharacterPrefix: config.shortName,
      tags: config.tags,
      cdn: false,
      domain: config.domain,
      containerConfigs: [
        {
          name: 'app',
          portMappings: [
            {
              hostPort: 4026,
              containerPort: 4026,
            },
          ],
          healthCheck: config.healthCheck,
          envVars: [
            {
              name: 'NODE_ENV',
              value: process.env.NODE_ENV,
            },
            {
              name: 'ENVIRONMENT',
              value: process.env.NODE_ENV, // this gives us a nice lowercase production and development
            },
            {
              name: 'AWS_DYNAMODB_ENDPOINT_URL',
              value: `https://dynamodb.${region.name}.amazonaws.com`,
            },
            {
              name: 'PROSPECT_API_PROSPECTS_TABLE',
              value: dynamodb.prospectsTable.dynamodb.name,
            },
            {
              name: 'AWS_S3_BUCKET',
              value: s3.id,
            },
            {
              name: 'SNOWPLOW_ENDPOINT',
              value: config.envVars.snowplowEndpoint,
            },
            {
              name: 'OTLP_COLLECTOR_URL',
              value: config.tracing.url,
            },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
          logGroup: this.createCustomLogGroup('app'),
          logMultilinePattern: '^\\S.+',
          secretEnvVars: [
            {
              name: 'SENTRY_DSN',
              valueFrom: `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}/SENTRY_DSN`,
            },
            {
              name: 'UNLEASH_ENDPOINT',
              valueFrom: `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/Shared/${config.environment}/UNLEASH_ENDPOINT`,
            },
            {
              name: 'UNLEASH_KEY',
              valueFrom: `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}/UNLEASH_KEY`,
            },
          ],
        },
      ],
      codeDeploy: {
        useCodeDeploy: true,
        useCodePipeline: false,
        useTerraformBasedCodeDeploy: false,
        generateAppSpec: false,
        snsNotificationTopicArn: snsTopic.arn,
        notifications: {
          notifyOnFailed: true,
          notifyOnSucceeded: false,
          notifyOnStarted: false,
        },
      },
      exposedContainer: {
        name: 'app',
        port: 4026,
        healthCheckPath: '/.well-known/apollo/server-health',
      },
      ecsIamConfig: {
        prefix: config.prefix,
        taskExecutionRolePolicyStatements: [
          //This policy could probably go in the shared module in the future.
          {
            actions: ['secretsmanager:GetSecretValue', 'kms:Decrypt'],
            resources: [
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:Shared`,
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:Shared/*`,
              secretsManagerKmsAlias.targetKeyArn,
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}`,
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}/*`,
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.prefix}`,
              `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.prefix}/*`,
            ],
            effect: 'Allow',
          },
          //This policy could probably go in the shared module in the future.
          {
            actions: ['ssm:GetParameter*'],
            resources: [
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}`,
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}/*`,
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/Shared/${config.environment}/*`,
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/Shared/${config.environment}`,
            ],
            effect: 'Allow',
          },
        ],
        taskRolePolicyStatements: [
          {
            actions: [
              'dynamodb:BatchGet*',
              'dynamodb:DescribeTable',
              'dynamodb:Get*',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:UpdateItem',
            ],
            resources: [
              dynamodb.prospectsTable.dynamodb.arn,
              `${dynamodb.prospectsTable.dynamodb.arn}/*`,
            ],
            effect: 'Allow',
          },
          {
            actions: ['s3:*'],
            resources: [`arn:aws:s3:::${s3.id}`, `arn:aws:s3:::${s3.id}/*`],
            effect: 'Allow',
          },
          {
            actions: ['events:PutEvents'],
            resources: [
              `arn:aws:events:${region.name}:${caller.accountId}:event-bus/${config.envVars.eventBusName}`,
            ],
            effect: 'Allow',
          },
          {
            actions: [
              'logs:PutLogEvents',
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:DescribeLogStreams',
              'logs:DescribeLogGroups',
            ],
            resources: ['*'],
            effect: 'Allow',
          },
        ],
        taskExecutionDefaultAttachmentArn:
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
      },
      autoscalingConfig: {
        targetMinCapacity: 2,
        targetMaxCapacity: 10,
      },
      alarms: {
        //TODO: When you start using the service add the pagerduty arns as an action for !config.isDev `pagerDuty.snsCriticalAlarmTopic.arn`
        http5xxErrorPercentage: {
          threshold: 25,
          evaluationPeriods: 4,
          period: 300,
          actions: config.isDev ? [] : [],
        },
      },
    });
  }
  /**
   * Create Custom log group for ECS to share across task revisions
   * @param containerName
   * @private
   */
  private createCustomLogGroup(containerName: string) {
    const logGroup = new CloudwatchLogGroup(
      this,
      `${containerName}-log-group`,
      {
        name: `/Backend/${config.prefix}/ecs/${containerName}`,
        retentionInDays: 90,
        tags: config.tags,
      },
    );

    return logGroup.name;
  }
}

const app = new App();
new ProspectAPI(app, 'prospect-api');
app.synth();
