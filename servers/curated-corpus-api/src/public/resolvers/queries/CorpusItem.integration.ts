import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../database/client';

import {
  CORPUS_ITEM_REFERENCE_RESOLVER,
  CORPUS_ITEM_TARGET_REFERENCE_RESOLVER,
} from './sample-queries.gql';
import { clearDb, createApprovedItemHelper } from '../../../test/helpers';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { ApprovedItem } from '../../../database/types';

describe('CorpusItem reference resolver', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  let approvedItem: ApprovedItem;
  let approvedItem2: ApprovedItem;
  let approvedItem3: ApprovedItem;
  let approvedItem4: ApprovedItem;
  let approvedItemCollection: ApprovedItem;
  let approvedItemSyndicated: ApprovedItem;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({
      app,
      publicServer: server,
      publicUrl: graphQLUrl,
    } = await startServer(0));

    db = client();

    await clearDb(db);

    approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
    });

    approvedItem2 = await createApprovedItemHelper(db, {
      title: 'Story two',
    });

    approvedItem3 = await createApprovedItemHelper(db, {
      title: 'Story three',
    });

    approvedItem4 = await createApprovedItemHelper(db, {
      title: 'Story four',
    });

    approvedItemSyndicated = await createApprovedItemHelper(db, {
      title: 'Syndicated story one',
      url: 'https://getpocket.com/explore/item/why-exhaustion-is-not-unique-to-our-overstimulated-age',
    });

    approvedItemCollection = await createApprovedItemHelper(db, {
      title: 'Collection story one',
      url: 'https://getpocket.com/collections/avocado-toast-was-king-these-recipes-are-vying-for-the-throne',
    });
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  /**
   * helper function to perform (minimal) metadata existence verification
   *
   * @param entityRepresentation representation of the CorpusItem returned by the graph
   * @param approvedItem ApprovedItem - the database approved item to compare to
   */
  const verifyCorpusItemMetadata = (
    entityRepresentation,
    approvedItem: ApprovedItem,
  ): void => {
    expect(entityRepresentation.id).toEqual(approvedItem.externalId);
    expect(entityRepresentation.title).toEqual(approvedItem.title);
    expect(entityRepresentation.authors).toHaveLength(
      <number>approvedItem.authors?.length,
    );
  };

  describe('CorpusItem by ID', () => {
    it('returns a single corpus item by reference resolver id', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItem.externalId,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem);
    });

    it('returns multiple corpus items by reference resolver id and sorts them in order of the ids given', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItem4.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem2.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem3.externalId,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(4);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);
      verifyCorpusItemMetadata(result.body.data?._entities[1], approvedItem);
      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem3);
    });

    it('should return null if the reference resolver id provided is not known', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: 'ABRACADABRA',
              },
            ],
          },
        });

      // The entity should be null
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0]).toBeNull();
    });

    it('handles a mix of valid and invalid ids and sorts the results in order of the ids given', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItem4.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: 'FAKEID',
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem2.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem3.externalId,
              },
              {
                __typename: 'CorpusItem',
                id: 'FAKEID2',
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(5);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);

      // index 1 was an invalid id, so the return should be null
      expect(result.body.data?._entities[1]).toBeNull();

      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem3);

      // index 4 was an invalid id, so the return should be null
      expect(result.body.data?._entities[4]).toBeNull();
    });
  });

  describe('CorpusItem by URL', () => {
    it('returns a single corpus item by reference resolver url', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                url: approvedItem.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem);
    });

    it('returns multiple corpus items by reference resolver url and sorts them in order of the urls given', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                url: approvedItem4.url,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem.url,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem2.url,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem3.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(4);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);
      verifyCorpusItemMetadata(result.body.data?._entities[1], approvedItem);
      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem3);
    });

    it('should return null if the reference resolver url provided is not known', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                url: 'https://fakeout.webthingy',
              },
            ],
          },
        });

      // The entity should be null
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0]).toBeNull();
    });

    it('handles a mix of valid and invalid urls and sorts the results in order of the urls given', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                url: approvedItem4.url,
              },
              {
                __typename: 'CorpusItem',
                url: 'https://fakeout.webthingy',
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem2.url,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem3.url,
              },
              {
                __typename: 'CorpusItem',
                url: 'https://fakeout.webthingy/ope',
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(5);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);

      // index 1 was an invalid id, so the return should be null
      expect(result.body.data?._entities[1]).toBeNull();

      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem3);

      // index 4 was an invalid id, so the return should be null
      expect(result.body.data?._entities[4]).toBeNull();
    });
  });

  describe('CorpusItems by ID and URL', () => {
    it('handles a mix of ids and urls and sorts the results in order of the identifiers given', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItem4.externalId,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem2.url,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem3.externalId,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(4);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);
      verifyCorpusItemMetadata(result.body.data?._entities[1], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem3);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem);
    });

    it('handles repeat entities and sorts the results in order of the identifiers given', async () => {
      console.log(approvedItem4);
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItem4.externalId,
              },
              {
                __typename: 'CorpusItem',
                url: approvedItem2.url,
              },
              {
                __typename: 'CorpusItem',
                id: approvedItem3.externalId,
              },
              // this is the same as the first entity, but referenced by url
              {
                __typename: 'CorpusItem',
                url: approvedItem4.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(4);

      // check the sort order & metadata - should be the same as the order of
      // representations above
      verifyCorpusItemMetadata(result.body.data?._entities[0], approvedItem4);
      verifyCorpusItemMetadata(result.body.data?._entities[1], approvedItem2);
      verifyCorpusItemMetadata(result.body.data?._entities[2], approvedItem3);
      verifyCorpusItemMetadata(result.body.data?._entities[3], approvedItem4);
    });
  });

  describe('reference resolver for SavedItem', () => {
    it('returns the corpus item if it exists on SavedItem', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'SavedItem',
                url: approvedItem.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      verifyCorpusItemMetadata(
        result.body.data?._entities[0].corpusItem,
        approvedItem,
      );
    });

    it('should return null on SavedItem if the url provided is not known', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'SavedItem',
                url: 'ABRACADABRA',
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0].corpusItem).toBeNull();
    });
  });

  describe('reference resolver for Item', () => {
    it('returns the corpus item if it exists on Item', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'Item',
                givenUrl: approvedItem.url,
                resolvedUrl: approvedItem.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      verifyCorpusItemMetadata(
        result.body.data?._entities[0].corpusItem,
        approvedItem,
      );
    });
    it('resolves the Item from resolvedUrl if givenUrl returns no record', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'Item',
                givenUrl: 'https://www.youtube.com/watch?v=kfVsfOSbJY0',
                resolvedUrl: approvedItem.url,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      verifyCorpusItemMetadata(
        result.body.data?._entities[0].corpusItem,
        approvedItem,
      );
    });

    it('should return null on Item if the givenUrl and resolvedUrl provided are not known', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'Item',
                givenUrl: 'ABRACADABRA',
                resolvedUrl: 'ABRACADABRA',
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0].corpusItem).toBeNull();
    });

    it('should return null on Item if the givenUrl provided is not known and resolvedUrl is null', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'Item',
                givenUrl: 'ABRACADABRA',
                resolvedUrl: null,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0].corpusItem).toBeNull();
    });
  });

  describe('target reference', () => {
    it('returns the corpus target if its syndicated', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_TARGET_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItemSyndicated.externalId,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);

      expect(result.body.data?._entities[0].title).toEqual(
        approvedItemSyndicated.title,
      );
      expect(result.body.data?._entities[0].target.slug).toEqual(
        'why-exhaustion-is-not-unique-to-our-overstimulated-age',
      );
      expect(result.body.data?._entities[0].target.__typename).toEqual(
        'SyndicatedArticle',
      );
    });

    it('returns the corpus target if its collection', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CORPUS_ITEM_TARGET_REFERENCE_RESOLVER),
          variables: {
            representations: [
              {
                __typename: 'CorpusItem',
                id: approvedItemCollection.externalId,
              },
            ],
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();
      expect(result.body.data?._entities).toHaveLength(1);
      expect(result.body.data?._entities[0].title).toEqual(
        approvedItemCollection.title,
      );
      expect(result.body.data?._entities[0].target.slug).toEqual(
        'avocado-toast-was-king-these-recipes-are-vying-for-the-throne',
      );
      expect(result.body.data?._entities[0].target.__typename).toEqual(
        'Collection',
      );
    });
  });
});
