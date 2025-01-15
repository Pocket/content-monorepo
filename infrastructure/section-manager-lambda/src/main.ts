import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { Construct } from 'constructs';
import { App, S3Backend, TerraformStack } from 'cdktf';

import { PocketVPC } from '@pocket-tools/terraform-modules';
import { config } from './config';
import { SectionManagerSQSLambda } from './sectionManagerLambda';
import { MlIamUserPolicy } from './iam';

class SectionManagerLambdaWraper extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: 'us-east-1',
      defaultTags: [{ tags: config.tags }],
    });
    new NullProvider(this, 'null-provider');
    new LocalProvider(this, 'local-provider');
    new ArchiveProvider(this, 'archive-provider');

    new S3Backend(this, {
      bucket: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      dynamodbTable: `mozilla-content-team-${config.environment.toLowerCase()}-terraform-state`,
      key: config.name,
      region: 'us-east-1',
    });

    const pocketVPC = new PocketVPC(this, 'pocket-vpc');

    const sqsLambda = new SectionManagerSQSLambda(
      this,
      'section-manager-sqs-lambda',
      pocketVPC,
    );

    new MlIamUserPolicy(
      this,
      'corpus-scheduler-ml-user-policy',
      sqsLambda.sqsQueue,
    );
  }
}
const app = new App();
new SectionManagerLambdaWraper(app, 'section-manager-lambda-wrapper');
app.synth();
