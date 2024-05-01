import { Construct } from 'constructs';
import {
  App,
  TerraformStack,
  MigrateIds,
  Aspects,
  S3Backend,
} from 'cdktf';

import {
  PocketVPC,
} from '@pocket-tools/terraform-modules';

import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { DataAwsRegion } from '@cdktf/provider-aws/lib/data-aws-region';
import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';

import { config } from './config';
import { DynamoDB } from 'infrastructure-common';
import { TranslationSqsLambda } from './translationSqsLambda';

class ProspectTranslationLambdaWrapper extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', { region: 'us-east-1' });

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
    const dynamodb = new DynamoDB(this, 'dynamodb', config.prefix, config.tags);

    new TranslationSqsLambda(
      this,
      'translation-lambda',
      dynamodb.prospectsTable,
    );

    // Pre cdktf 0.17 ids were generated differently so we need to apply a migration aspect
    // https://developer.hashicorp.com/terraform/cdktf/concepts/aspects
    Aspects.of(this).add(new MigrateIds());
  }
}

const app = new App();
new ProspectTranslationLambdaWrapper(app, 'prospect-translation-lambda-wrapper');
app.synth();
