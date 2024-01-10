import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');

import {
  Prospect,
  Topics,
  ProspectType,
  dbClient,
  getProspectById,
  insertProspect,
  truncateDb,
  toUnixTimestamp,
} from 'prospectapi-common';

import config from '../config';
import {
  getProspectsForDeletion,
  batchDeleteProspects,
  deleteOldProspects,
} from './lib';

// so we can expect on async functions
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('dynamodb', () => {
  let prospect: Prospect;

  beforeEach(() => {
    prospect = {
      id: 'ou812',
      prospectId: 'ou813',
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      topic: Topics.GAMING,
      prospectType: ProspectType.TIMESPENT,
      url: 'https://getpocket.com',
      saveCount: 1680,
      rank: 93,
    };
  });

  afterEach(async () => {
    await truncateDb(dbClient);
  });

  describe('getProspectById', () => {
    it('should retrieve by a valid id', async () => {
      await insertProspect(dbClient, prospect);

      const res = await getProspectById(dbClient, prospect.id);

      expect(res).not.to.be.undefined;
    });
  });

  describe('batchDeleteProspects', () => {
    it('should delete a single prospect by id', async () => {
      // insert a prospect
      await insertProspect(dbClient, prospect);

      // delete it
      await batchDeleteProspects(dbClient, [prospect.id]);

      // make sure it's gone
      const res = await getProspectById(dbClient, prospect.id);

      expect(res).to.be.undefined;
    });

    it('should delete multiple prospects by id', async () => {
      // insert some prospects
      prospect.id = 'deleteTest';

      for (let i = 0; i < 5; i++) {
        prospect.id = `deleteTest${i}`;

        await insertProspect(dbClient, prospect);
      }

      await batchDeleteProspects(dbClient, [
        'deleteTest1',
        'deleteTest2',
        'deleteTest4',
        'deleteTest5',
      ]);

      // make sure!

      // this one should be deleted
      let res = await getProspectById(dbClient, 'deleteTest1');
      expect(res).to.be.undefined;

      // this one should still exist
      res = await getProspectById(dbClient, 'deleteTest3');
      expect(res).not.to.be.undefined;
    });

    it(`should throw if trying to delete more than ${config.aws.dynamoDb.maxBatchDelete} items (dynamo limit)`, async () => {
      // insert some prospects
      prospect.id = 'batchDeleteTooBigTest';
      const prospectIds: string[] = [];

      // one too many!
      for (let i = 0; i < config.aws.dynamoDb.maxBatchDelete + 1; i++) {
        prospect.id += 1;

        await insertProspect(dbClient, prospect);

        prospectIds.push(prospect.id);
      }

      await expect(
          batchDeleteProspects(dbClient, prospectIds)
      ).to.be.rejectedWith(
          `cannot delete more than ${config.aws.dynamoDb.maxBatchDelete} dynamo items at once! you are trying to delete ${prospectIds.length}!`
      );
    });
  });

  describe('getProspectsForDeletion', () => {
    it('should retrieve expected results for provided scheduledSurfaceGuid and prospectType', async () => {
      // insert a bunch of prospects matching the new tab and prospect type we
      // want to delete. some of these will be 'new' and should not be deleted,
      // some will be old and should be deleted
      const now = new Date();

      // mock date of prospects added from the current batch of SQS messages
      const aFewMinutesAgo = toUnixTimestamp(
          new Date(now.valueOf() - 3 * 60000)
      );

      // mock date of prospects added from the previous SQS batch
      const lastMetaflowRun = toUnixTimestamp(
          new Date(
              now.valueOf() - (config.aws.dynamoDb.maxAgeBeforeDeletion + 1) * 60000
          )
      );

      // insert some EN_US/TIMESPENT prospects
      for (let i = 0; i < 12; i++) {
        prospect.id += 1;

        // half the prospects should have been just added, the other half
        // from a previous metaflow run / SQS batch
        prospect.createdAt = i % 2 ? aFewMinutesAgo : lastMetaflowRun;

        await insertProspect(dbClient, prospect);
      }

      // insert some EN_US/SYNDICATED_NEW
      prospect.prospectType = ProspectType.SYNDICATED_NEW;

      for (let i = 0; i < 5; i++) {
        prospect.id += 1;

        // to make sure timeframe isn't the *only* factor in retrieving
        // prospects for deleting, make sure half of these *do* satisfy the
        // time requirement (but do not satisfy the ProspectType requirement)
        prospect.createdAt = i % 2 ? aFewMinutesAgo : lastMetaflowRun;

        await insertProspect(dbClient, prospect);
      }

      const res = await getProspectsForDeletion(
          dbClient,
          'NEW_TAB_EN_US',
          ProspectType.TIMESPENT
      );

      // only half of the EN_US/TIMESPENT prospects should be returned, as the
      // other half are too new. none of the 5 EN_US/SYNDICATED_NEW prospects
      // should be returned
      expect(res.length).to.equal(6);

      // should only get EN_US prospects that are 'old'
      for (let i = 0; i < res.length; i++) {
        expect(res[i].scheduledSurfaceGuid).to.equal('NEW_TAB_EN_US');
        expect(res[i].prospectType).to.equal(ProspectType.TIMESPENT);
        expect(res[i].createdAt).to.be.equal(lastMetaflowRun);
      }
    });
  });

  describe('deleteOldProspects', () => {
    it('should delete all old prospects by new tab and prospect type', async () => {
      // insert a bunch of prospects matching the new tab and prospect type we
      // want to delete. some of these will be 'new' and should not be deleted,
      // some will be old and should be deleted
      const now = new Date();

      // mock date of prospects added from the current batch of SQS messages
      const aFewMinutesAgo = toUnixTimestamp(
          new Date(now.valueOf() - 3 * 60000)
      );

      // mock date of prospects added from the previous SQS batch
      const lastMetaflowRun = toUnixTimestamp(
          new Date(
              now.valueOf() - (config.aws.dynamoDb.maxAgeBeforeDeletion + 1) * 60000
          )
      );

      let prospectCreatedAt;

      // ids need to be unique! set this before the for loop
      prospect.id = 'shouldBeDeleted';

      // these will all be EN_US/TIMESPENT
      for (let i = 0; i < 12; i++) {
        // so we can test the time limit on the delete, half the prospects
        // should have been just added, the other half from a previous metaflow
        // run / SQS batch
        if (i % 2) {
          prospectCreatedAt = aFewMinutesAgo;
        } else {
          prospectCreatedAt = lastMetaflowRun;
        }

        // fake a set of prospects returned from dynamo
        await insertProspect(
            dbClient,
            Object.assign({}, prospect, {
              id: prospect.id + i,
              createdAt: prospectCreatedAt,
            })
        );
      }

      // insert some prospects not matching the new tab/prospect type to verify
      // we aren't deleting too much data

      // ids need to be unique! set this before the for loop
      prospect.id = 'shouldBeRetained';

      // these should all be EN_US/SYNDICATED_NEW
      for (let i = 0; i < 12; i++) {
        // half the prospects should have been just added, the other half
        // from a previous metaflow run / SQS batch
        if (i % 2) {
          prospectCreatedAt = aFewMinutesAgo;
        } else {
          prospectCreatedAt = lastMetaflowRun;
        }

        // fake a set of prospects returned from dynamo
        await insertProspect(
            dbClient,
            Object.assign({}, prospect, {
              id: prospect.id + i,
              // change the prospectType - this should mean they won't be
              // deleted
              prospectType: ProspectType.SYNDICATED_NEW,
              createdAt: prospectCreatedAt,
            })
        );
      }


      // delete!
      // this should delete 6 records
      await deleteOldProspects(
          dbClient,
          'NEW_TAB_EN_US',
          ProspectType.TIMESPENT
      );

      // verify delete worked as expected
      // we shouldn't get any results awaiting deletion
      const deleteMeProspects = await getProspectsForDeletion(
          dbClient,
          'NEW_TAB_EN_US',
          ProspectType.TIMESPENT
      );

      expect(deleteMeProspects.length).to.equal(0);
    });

    it('should delete prospects in multiple batches', async () => {
      // 52, meaning three "bathces" of deletes
      const deletableCountToInsert = config.aws.dynamoDb.maxBatchDelete * 2 + 2;
      const now = new Date();

      // mock date of prospects added from an old, deletable SQS batch
      const lastMetaflowRun = toUnixTimestamp(
          new Date(
              now.valueOf() - (config.aws.dynamoDb.maxAgeBeforeDeletion + 1) * 60000
          )
      );

      // ids need to be unique! set this before the for loop
      prospect.id = 'batchDeletes';

      // insert more than 2 batch sizes of prospects
      for (let i = 0; i < deletableCountToInsert; i++) {
        // fake a set of prospects returned from dynamo
        await insertProspect(
            dbClient,
            Object.assign({}, prospect, {
              id: prospect.id + i,
              createdAt: lastMetaflowRun,
            })
        );
      }

      // delete!
      // this should delete all records
      await deleteOldProspects(
          dbClient,
          'NEW_TAB_EN_US',
          ProspectType.TIMESPENT
      );
    });
  });
});
