import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { Construct } from 'constructs';
import {App, RemoteBackend, TerraformStack} from 'cdktf';
import { TranslationSqsLambda } from './translationSqsLambda';
import { DynamoDB } from 'infrastructure-common';
import { config } from './config';

class TranslationSQSLambdaWraper extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', { region: 'us-east-1' });
    new NullProvider(this, 'null-provider');
    new LocalProvider(this, 'local-provider');
    new ArchiveProvider(this, 'archive-provider');

    new RemoteBackend(this, {
      hostname: 'app.terraform.io',
      organization: 'Pocket',
      workspaces: [{ name: `${config.name}-${config.environment}` }],
    });

    const dynamodb = new DynamoDB(
      this,
      'dynamodb',
      `${config.shortName}-${config.environment}`,
      config.tags,
    );

    new TranslationSqsLambda(
      this,
      'translation-lambda',
      dynamodb.prospectsTable,
    );
  }
}
const app = new App();
new TranslationSQSLambdaWraper(app, 'translation-sqs-lambda-wrapper');
app.synth();
