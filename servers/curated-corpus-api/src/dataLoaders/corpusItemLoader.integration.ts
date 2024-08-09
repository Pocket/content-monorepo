import { ApprovedItem, PrismaClient } from '.prisma/client';
import { client } from '../database/client';
import { clearDb, createApprovedItemHelper } from '../test/helpers';
import {
  batchLoadById,
  batchLoadByUrl,
  createCorpusItemDataLoaders,
} from './corpusItemLoader';
import {
  getApprovedItemsByExternalIds,
  getApprovedItemsByUrls,
} from '../database/queries/ApprovedItem';

describe('queries: CorpusItem dataloader', () => {
  let db: PrismaClient;

  let approvedItem1: ApprovedItem;
  let approvedItem2: ApprovedItem;
  let approvedItem3: ApprovedItem;
  let approvedItem4: ApprovedItem;
  let approvedItem5: ApprovedItem;

  let dataLoaders;

  beforeAll(async () => {
    db = client();

    await clearDb(db);

    approvedItem1 = await createApprovedItemHelper(db, {
      title: 'item 1',
      url: 'https://article.com/1',
    });

    approvedItem2 = await createApprovedItemHelper(db, {
      title: 'item 2',
      url: 'https://article.com/2',
    });

    approvedItem3 = await createApprovedItemHelper(db, {
      title: 'item 3',
      url: 'https://article.com/3',
    });

    approvedItem4 = await createApprovedItemHelper(db, {
      title: 'item 4',
      url: 'https://article.com/4',
    });

    approvedItem5 = await createApprovedItemHelper(db, {
      title: 'item 5',
      url: 'https://article.com/5',
    });

    dataLoaders = createCorpusItemDataLoaders(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe('dataloading by id', () => {
    describe('getApprovedItemsByIds', () => {
      it('can get approved items by ids', async () => {
        const results = await getApprovedItemsByExternalIds(db, [
          approvedItem5.externalId,
          approvedItem1.externalId,
          approvedItem3.externalId,
          approvedItem2.externalId,
        ]);

        expect(results.length).toEqual(4);

        results.forEach((result) => {
          expect(result).not.toBeNull();
        });
      });

      it('can get approved items by ids and skip invalid ids', async () => {
        const results = await getApprovedItemsByExternalIds(db, [
          approvedItem5.externalId,
          approvedItem1.externalId,
          'FAKEID',
          approvedItem3.externalId,
        ]);

        expect(results.length).toEqual(3);

        results.forEach((result) => {
          expect(result).not.toBeNull();
        });
      });
    });

    describe('batchLoadById', () => {
      it('retrieves multiple items by id and sorts them in the order of the ids passed', async () => {
        const results = await batchLoadById(db, [
          approvedItem5.externalId,
          approvedItem3.externalId,
          approvedItem4.externalId,
          approvedItem1.externalId,
        ]);

        expect(results.length).toEqual(4);

        expect(results[0].id).toEqual(approvedItem5.externalId);
        expect(results[1].id).toEqual(approvedItem3.externalId);
        expect(results[2].id).toEqual(approvedItem4.externalId);
        expect(results[3].id).toEqual(approvedItem1.externalId);
      });

      it('returns undefined for invalid ids', async () => {
        const results = await batchLoadById(db, [
          approvedItem5.externalId,
          approvedItem3.externalId,
          'FAKEID',
          approvedItem1.externalId,
        ]);

        expect(results.length).toEqual(4);

        expect(results[0].id).toEqual(approvedItem5.externalId);
        expect(results[1].id).toEqual(approvedItem3.externalId);
        expect(results[2]).toBeUndefined();
        expect(results[3].id).toEqual(approvedItem1.externalId);
      });
    });

    describe('corpusItemsByIdLoader', () => {
      it('loads a corpus item by id', async () => {
        const item = await dataLoaders.corpusItemsById.load(
          approvedItem1.externalId,
        );

        expect(item).not.toBeNull();
        expect(item.id).toEqual(approvedItem1.externalId);
      });

      it('returns undefined for an invalid id', async () => {
        const item = await dataLoaders.corpusItemsById.load('FAKEID');

        expect(item).toBeUndefined();
      });
    });
  });

  describe('dataloading by url', () => {
    describe('getApprovedItemsByUrls', () => {
      it('can get approved items by urls', async () => {
        const results = await getApprovedItemsByUrls(db, [
          approvedItem5.url,
          approvedItem1.url,
          approvedItem3.url,
        ]);

        expect(results.length).toEqual(3);

        results.forEach((result) => {
          expect(result).not.toBeNull();
        });
      });

      it('can get approved items by ids and skip invalid urls', async () => {
        const results = await getApprovedItemsByUrls(db, [
          approvedItem5.url,
          approvedItem1.url,
          'https://fakeout.webthingy',
          approvedItem3.url,
        ]);

        expect(results.length).toEqual(3);

        results.forEach((result) => {
          expect(result).not.toBeNull();
        });
      });
    });

    describe('batchLoadByUrl', () => {
      it('retrieves multiple items by url and sorts them in the order of the urls passed', async () => {
        const results = await batchLoadByUrl(db, [
          approvedItem5.url,
          approvedItem3.url,
          approvedItem4.url,
          approvedItem1.url,
        ]);

        expect(results.length).toEqual(4);

        expect(results[0].url).toEqual(approvedItem5.url);
        expect(results[1].url).toEqual(approvedItem3.url);
        expect(results[2].url).toEqual(approvedItem4.url);
        expect(results[3].url).toEqual(approvedItem1.url);
      });

      it('returns undefined for invalid urls', async () => {
        const results = await batchLoadByUrl(db, [
          approvedItem5.url,
          approvedItem3.url,
          'https://fakeout.webthingy',
          approvedItem1.url,
        ]);

        expect(results.length).toEqual(4);

        expect(results[0].url).toEqual(approvedItem5.url);
        expect(results[1].url).toEqual(approvedItem3.url);
        expect(results[2]).toBeUndefined();
        expect(results[3].url).toEqual(approvedItem1.url);
      });
    });

    describe('corpusItemsByUrlLoader', () => {
      it('loads a corpus item by id', async () => {
        const item = await dataLoaders.corpusItemsByUrl.load(approvedItem1.url);

        expect(item).not.toBeNull();
        expect(item.url).toEqual(approvedItem1.url);
      });

      it('returns undefined for an invalid url', async () => {
        const item = await dataLoaders.corpusItemsByUrl.load(
          'https://fakeout.webthingy',
        );

        expect(item).toBeUndefined();
      });
    });
  });
});
