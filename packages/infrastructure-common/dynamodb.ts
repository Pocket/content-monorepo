import { Construct } from 'constructs';
import { config } from './config';
import {
    ApplicationDynamoDBTable,
    ApplicationDynamoDBTableCapacityMode,
} from '@pocket-tools/terraform-modules';

export class DynamoDB extends Construct {
    public readonly prospectsTable: ApplicationDynamoDBTable;

    constructor(
        scope: Construct,
        name: string,

    ) {
        super(scope, name);
        this.prospectsTable = this.setupProspectsTable();
    }

    /**
     * Sets up the dynamodb table where the prospects will live
     * @private
     */
    private setupProspectsTable() {
        // note that this config is mirrored in .docker/localstack/dynamodb/
        // if config changes here, that file should also be updated
        return new ApplicationDynamoDBTable(this, `prospects`, {
            tags: config.tags,
            prefix: `${config.shortName}-${config.environment}-Prospects`,
            capacityMode: ApplicationDynamoDBTableCapacityMode.ON_DEMAND,
            tableConfig: {
                hashKey: 'id',
                // writeCapacity: 5,
                // readCapacity: 5,
                attribute: [
                    {
                        name: 'id',
                        type: 'S',
                    },
                    {
                        // the scheduled surface the prospect is targeted towards, e.g. "NEW_TAB_EN_US", "POCKET_HITS_DE_DE"
                        name: 'scheduledSurfaceGuid',
                        type: 'S',
                    },
                    {
                        name: 'prospectType',
                        type: 'S',
                    },
                ],
                // we will be retrieving prospects based on `scheduledSurfaceGuid`
                // grouping ("ranging") by prospectType comes in handy when replacing
                // prospects from SQS messages
                globalSecondaryIndex: [
                    {
                        name: 'scheduledSurfaceGuid-prospectType',
                        hashKey: 'scheduledSurfaceGuid',
                        rangeKey: 'prospectType',
                        projectionType: 'ALL',
                        readCapacity: 5,
                        writeCapacity: 5,
                    },
                ],
            },
        });
    }
}
