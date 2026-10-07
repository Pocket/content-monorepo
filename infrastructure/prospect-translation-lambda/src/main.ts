import { Construct } from 'constructs';
import { App, TerraformStack, S3Backend } from 'cdktf';

import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';

import { config } from './config';

// Emptied so CI destroys the prospect translation lambda infra. The providers
// and backend stay so Terraform can find the state and destroy what's in it.
class ProspectTranslationLambdaWrapper extends TerraformStack {
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
      key: `${config.name}-Sqs-Translation-Lambda`,
      region: 'us-east-1',
    });
  }
}

const app = new App();
new ProspectTranslationLambdaWrapper(
  app,
  'prospect-translation-lambda-wrapper',
);
app.synth();
