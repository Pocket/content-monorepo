import { ArchiveProvider } from '@cdktf/provider-archive/lib/provider';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { LocalProvider } from '@cdktf/provider-local/lib/provider';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { Construct } from 'constructs';
import {
    App,
    S3Backend,
    TerraformStack,
} from 'cdktf';

import {
    PocketVPC,
} from '@pocket-tools/terraform-modules';
import { config } from './config';
import {CorpusSchedulerSQSLambda} from "./corpusSchedulerLambda";

class CorpusSchedulerLambdaWraper extends TerraformStack {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        new AwsProvider(this, 'aws', { region: 'us-east-1' });
        new NullProvider(this, 'null-provider');
        new LocalProvider(this, 'local-provider');
        new ArchiveProvider(this, 'archive-provider');

        new S3Backend(this, {
            bucket: `mozilla-pocket-team-${config.environment.toLowerCase()}-terraform-state`,
            dynamodbTable: `mozilla-pocket-team-${config.environment.toLowerCase()}-terraform-state`,
            key: config.name,
            region: 'us-east-1',
        });

        const pocketVPC = new PocketVPC(this, 'pocket-vpc');

        new CorpusSchedulerSQSLambda(this, 'corpus-scheduler-sqs-lambda', pocketVPC);
    }
}
const app = new App();
new CorpusSchedulerLambdaWraper(app, 'corpus-scheduler-lambda-wrapper');
app.synth();
