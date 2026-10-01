import { Construct } from 'constructs';
import { App, TerraformStack, S3Backend } from 'cdktf';

import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';

import { config } from './config';

// Emptied so CI destroys the prospect-api infra. The providers and backend
// stay so Terraform can find the state and destroy what's in it.
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

    // Metaflow uses this IAM user, and section-manager-lambda now imports it.
    // Drop it from this state instead of destroying it.
    this.addOverride('removed', [
      { from: 'aws_iam_user.iam_user', lifecycle: { destroy: false } },
    ]);
  }
}

const app = new App();
new ProspectAPI(app, 'prospect-api');
app.synth();
