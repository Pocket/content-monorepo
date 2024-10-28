import { Construct } from 'constructs';
import {
  App,
  TerraformStack,
  MigrateIds,
  Aspects,
  S3Backend,
} from 'cdktf';
import { config } from './config';
import {
  ApplicationRDSCluster,
  PocketALBApplication,
  PocketAwsSyntheticChecks,
  PocketVPC,
} from '@pocket-tools/terraform-modules';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsSnsTopic } from '@cdktf/provider-aws/lib/data-aws-sns-topic';
import { DataAwsKmsAlias } from '@cdktf/provider-aws/lib/data-aws-kms-alias';
import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { CloudwatchLogGroup } from '@cdktf/provider-aws/lib/cloudwatch-log-group';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
class CollectionAPI extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new ArchiveProvider(this, 'archive-provider');
    new AwsProvider(this, 'aws', {
      region: 'us-east-1',
      defaultTags: [{ tags: config.tags }],
    });
    new LocalProvider(this, 'local_provider');
    new NullProvider(this, 'null_provider');

    new S3Backend(this, {
      bucket: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      dynamodbTable: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      key: config.name,
      region: 'us-east-1',
    });

    const caller = new DataAwsCallerIdentity(this, 'caller');
    const pocketVpc = new PocketVPC(this, 'pocket-vpc');
    const region = new DataAwsRegion(this, 'region');

    this.createPocketAlbApplication({
      rds: this.createRds(pocketVpc),
      s3: this.createS3Bucket(),
      secretsManagerKmsAlias: this.getSecretsManagerKmsAlias(),
      snsTopic: this.getCodeDeploySnsTopic(),
      region,
      caller,
    });

    new PocketAwsSyntheticChecks(this, 'synthetics', {
      alarmTopicArn: '',
      environment: config.environment,
      prefix: config.prefix,
      query: [
        {
          endpoint: config.domain,
          data: '{"query": "query { collectionBySlug(slug: \\"12-gripping-true-crime-reads\\") {slug} }"}',
          jmespath: 'data.collectionBySlug.slug',
          response: '12-gripping-true-crime-reads',
        },
      ],
      securityGroupIds: pocketVpc.defaultSecurityGroups.ids,
      shortName: config.shortName,
      subnetIds: pocketVpc.privateSubnetIds,
      tags: config.tags,
      uptime: [
        {
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
    return new S3Bucket(this, 'image-uploads', {
      bucket: `pocket-${config.prefix.toLowerCase()}-images`,
      tags: config.tags,
    });
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
        databaseName: 'collections',
        masterUsername: 'pkt_collections',
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

  private createPocketAlbApplication(dependencies: {
    rds: ApplicationRDSCluster;
    s3: S3Bucket;
    region: DataAwsRegion;
    caller: DataAwsCallerIdentity;
    secretsManagerKmsAlias: DataAwsKmsAlias;
    snsTopic: DataAwsSnsTopic;
  }): PocketALBApplication {
    const {
      rds,
      s3,
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
        cpu: 1024,
        memory: 8192,
      },
      containerConfigs: [
        {
          name: 'app',
          portMappings: [
            {
              hostPort: 4004,
              containerPort: 4004,
            },
          ],
          healthCheck: {
            command: [
              'CMD-SHELL',
              'curl -f http://localhost:4004/.well-known/apollo/server-health || exit 1',
            ],
            interval: 15,
            retries: 3,
            timeout: 5,
            startPeriod: 0,
          },
          envVars: [
            {
              name: 'NODE_ENV',
              value: process.env.NODE_ENV, // this gives us a nice lowercase production and development
            },
            {
              name: 'AWS_S3_BUCKET',
              value: s3.id,
            },
            {
              name: 'EVENT_BUS_NAME',
              value: config.eventBusName,
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
        port: 4004,
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
              `arn:aws:events:${region.name}:${caller.accountId}:event-bus/${config.eventBusName}`,
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
        // 2023-10-30: 3x request volume caused spikes in 504 errors, CPU, memory, latency.
        // Even though task count scaled out to 10, the CPU load was still 80%.
        // Allow for faster auto-scaling to handle request spikes from scheduled tasks.
        targetMinCapacity: config.environment === 'Prod' ? 4 : 1,
        targetMaxCapacity: config.environment === 'Prod' ? 20 : 4,
        scaleOutThreshold: 25,
        scaleInThreshold: 15,
        stepScaleOutAdjustment: 4,
      },
      alarms: {
        // alarms if >= 25% of responses are 5xx over 20 minutes
        http5xxErrorPercentage: {
          threshold: 25, // 25%
          period: 300, // 5 minutes
          evaluationPeriods: 4, // 20 minutes total
          actions: [],
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
new CollectionAPI(app, 'collection-api');
app.synth();
