import { Construct } from 'constructs';
import {
  App,
  DataTerraformRemoteState,
  TerraformStack,
  MigrateIds,
  Aspects,
  S3Backend,
} from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { config } from './config';
import {
  ApplicationRDSCluster,
  PocketALBApplication,
  PocketAwsSyntheticChecks,
  PocketPagerDuty,
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { DataAwsSnsTopic } from '@cdktf/provider-aws/lib/data-aws-sns-topic';
import { DataAwsKmsAlias } from '@cdktf/provider-aws/lib/data-aws-kms-alias';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { S3BucketOwnershipControls } from '@cdktf/provider-aws/lib/s3-bucket-ownership-controls';

import { CloudwatchLogGroup } from '@cdktf/provider-aws/lib/cloudwatch-log-group';

class CuratedCorpusAPI extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: 'us-east-1',
      defaultTags: [{ tags: config.tags }],
    });
    new LocalProvider(this, 'local_provider');
    new NullProvider(this, 'null_provider');
    new PagerdutyProvider(this, 'pagerduty_provider', { token: undefined });

    new S3Backend(this, {
      bucket: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      dynamodbTable: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      key: config.name,
      region: 'us-east-1',
    });

    const caller = new DataAwsCallerIdentity(this, 'caller');
    const region = new DataAwsRegion(this, 'region');
    const pocketVpc = new PocketVPC(this, 'pocket-vpc');
    const curatedCorpusPagerduty = this.createPagerDuty();

    this.createPocketAlbApplication({
      rds: this.createRds(pocketVpc),
      s3: this.createS3Bucket(),
      pagerDuty: curatedCorpusPagerduty,
      secretsManagerKmsAlias: this.getSecretsManagerKmsAlias(),
      snsTopic: this.getCodeDeploySnsTopic(),
      region,
      caller,
    });

    new PocketAwsSyntheticChecks(this, 'synthetics', {
      alarmTopicArn:
        config.environment === 'Prod'
          ? curatedCorpusPagerduty.snsCriticalAlarmTopic.arn
          : '', // this should be improved, empty string recreates updates constantly as is in cdktf
      environment: process.env.NODE_ENV === 'development' ? 'Dev' : 'Prod', // yes we should use config.environment, but needs more refinment in module
      prefix: config.prefix,
      query: [
        {
          // New Tab relies upon scheduledSurface query & upon corpusItem resolution
          endpoint: config.domain,
          data: '{"query": "query { scheduledSurface(id: \\"NEW_TAB_EN_US\\") {items(date: \\"2023-05-30\\") {corpusItem {id, url}}}}"}',
          jmespath:
            'to_string(data.scheduledSurface.items[].corpusItem[] | [0].id != null)', // confirm all corpusItems have a non-null id field present
          response: 'true',
        },
      ],
      securityGroupIds: pocketVpc.defaultSecurityGroups.ids,
      shortName: config.shortName,
      subnetIds: pocketVpc.privateSubnetIds,
      tags: config.tags,
      uptime: [
        {
          // is the express server up?
          response: 'ok',
          url: `${config.domain}/.well-known/apollo/server-health`,
        },
      ],
    });
    // Pre cdktf 0.17 ids were generated differently so we need to apply a migration aspect
    // https://developer.hashicorp.com/terraform/cdktf/concepts/aspects
    Aspects.of(this).add(new MigrateIds());
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
   * Create S3 bucket for image uploads
   * @private
   */
  private createS3Bucket() {
    const bucket_name = `pocket-${config.prefix.toLowerCase()}-images`;
    const bucket = new S3Bucket(this, 'image-uploads', {
      bucket: bucket_name,
    });
    const bucket_with_public_acls = new S3BucketPublicAccessBlock(
      this,
      `${bucket_name}_access_block`,
      {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        bucket: bucket.id,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    );
    const ownershipControls = new S3BucketOwnershipControls(
      this,
      `${bucket_name}_ownership_controls`,
      {
        bucket: bucket.id,
        rule: {
          objectOwnership: 'ObjectWriter',
        },
      },
    );
    bucket_with_public_acls.overrideLogicalId(bucket_name);
    ownershipControls.overrideLogicalId(bucket_name);
    return bucket;
  }

  /**
   * Creat Aurora database
   * @param pocketVpc
   * @private
   */
  private createRds(pocketVpc: PocketVPC) {
    return new ApplicationRDSCluster(this, 'rds', {
      prefix: config.prefix,
      vpcId: pocketVpc.vpc.id,
      subnetIds: pocketVpc.privateSubnetIds,
      rdsConfig: {
        databaseName: 'curation_corpus',
        masterUsername: 'pkt_curation_corpus',
        engine: 'aurora-mysql',
        engineMode: 'provisioned',
        engineVersion: '8.0.mysql_aurora.3.06.0',
        serverlessv2ScalingConfiguration: {
          minCapacity: config.rds.minCapacity,
          maxCapacity: config.rds.maxCapacity,
        },
        createServerlessV2Instance: true,
      },

      tags: config.tags,
    });
  }

  /**
   * Create PagerDuty service for alerts
   * @private
   */
  private createPagerDuty() {
    const incidentManagement = new DataTerraformRemoteState(
      this,
      'incident_management',
      {
        organization: 'Pocket',
        workspaces: {
          name: 'incident-management',
        },
      },
    );

    return new PocketPagerDuty(this, 'pagerduty', {
      prefix: config.prefix,
      service: {
        criticalEscalationPolicyId: incidentManagement
          .get('policy_default_critical_id')
          .toString(),
        nonCriticalEscalationPolicyId: incidentManagement
          .get('policy_default_non_critical_id')
          .toString(),
      },
    });
  }

  private createPocketAlbApplication(dependencies: {
    rds: ApplicationRDSCluster;
    s3: S3Bucket;
    pagerDuty: PocketPagerDuty;
    region: DataAwsRegion;
    caller: DataAwsCallerIdentity;
    secretsManagerKmsAlias: DataAwsKmsAlias;
    snsTopic: DataAwsSnsTopic;
  }): PocketALBApplication {
    const {
      rds,
      s3,
      pagerDuty,
      region,
      caller,
      secretsManagerKmsAlias,
      snsTopic,
    } = dependencies;

    return new PocketALBApplication(this, 'application', {
      internal: true,
      prefix: config.prefix,
      alb6CharacterPrefix: config.shortName,
      tags: config.tags,
      cdn: false,
      domain: config.domain,
      taskSize: {
        cpu: 4096,
        memory: 16384,
      },
      containerConfigs: [
        {
          name: 'app',
          portMappings: [
            {
              hostPort: 4025,
              containerPort: 4025,
            },
          ],
          healthCheck: config.healthCheck,
          envVars: [
            {
              name: 'NODE_ENV',
              value: process.env.NODE_ENV,
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
              name: 'EVENT_BUS_NAME',
              value: config.eventBus.name,
            },
            {
              name: 'AWS_REGION',
              value: region.name,
            },
            {
              name: 'LOG_LEVEL',
              // do not log http, graphql, or debug events in production
              value: config.environment === 'Prod' ? 'info' : 'debug',
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
              name: 'DATABASE_URL',
              valueFrom: `${rds.secretARN}:database_url::`,
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
        port: 4025,
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
            ],
            effect: 'Allow',
          },
        ],
        taskRolePolicyStatements: [
          {
            actions: ['s3:*'],
            resources: [`arn:aws:s3:::${s3.id}`, `arn:aws:s3:::${s3.id}/*`],
            effect: 'Allow',
          },
          {
            actions: ['events:PutEvents'],
            resources: [
              `arn:aws:events:${region.name}:${caller.accountId}:event-bus/${config.eventBus.name}`,
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
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
              'xray:GetSamplingRules',
              'xray:GetSamplingTargets',
              'xray:GetSamplingStatisticSummaries',
            ],
            resources: ['*'],
            effect: 'Allow',
          },
        ],
        taskExecutionDefaultAttachmentArn:
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
      },
      autoscalingConfig: {
        targetMinCapacity: config.isDev ? 1 : 4,
        targetMaxCapacity: 10,
      },
      alarms: {
        // A non-critical alarm will be raised if request latency
        // exceeds 500 ms within a 15-minute period four times in a row.
        httpLatency: {
          evaluationPeriods: 4, // 1 hr total
          threshold: 500, // 500 ms
          period: 900, // 15 minutes
          actions: config.isDev ? [] : [pagerDuty.snsNonCriticalAlarmTopic.arn],
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
new CuratedCorpusAPI(app, 'curated-corpus-api');
app.synth();
