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

describe('CorpusItem reference resolver', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({
      app,
      publicServer: server,
      publicUrl: graphQLUrl,
    } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  it('returns the corpus item if it exists by reference resolver id', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
    });

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
    expect(result.body.data?._entities[0].title).toEqual(approvedItem.title);
    expect(result.body.data?._entities[0].authors).toHaveLength(
      <number>approvedItem.authors?.length
    );
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

  it('returns the corpus item if it exists by reference resolver url', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
    });

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
    expect(result.body.data?._entities[0].title).toEqual(approvedItem.title);
    expect(result.body.data?._entities[0].authors).toHaveLength(
      <number>approvedItem.authors?.length
    );
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
              url: 'ABRACADABRA',
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

  it('returns the corpus item if it exists on savedItem', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
    });

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
    expect(result.body.data?._entities[0].corpusItem.title).toEqual(
      approvedItem.title,
    );
    expect(result.body.data?._entities[0].corpusItem.authors).toHaveLength(
      <number>approvedItem.authors?.length,
    );
  });

  it('returns the corpus item if it exists on Item', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
    });

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(CORPUS_ITEM_REFERENCE_RESOLVER),
        variables: {
          representations: [
            {
              __typename: 'Item',
              givenUrl: approvedItem.url,
            },
          ],
        },
      });

    expect(result.body.errors).toBeUndefined();

    expect(result.body.data).not.toBeNull();
    expect(result.body.data?._entities).toHaveLength(1);
    expect(result.body.data?._entities[0].corpusItem.title).toEqual(
      approvedItem.title,
    );
    expect(result.body.data?._entities[0].corpusItem.authors).toHaveLength(
      <number>approvedItem.authors?.length,
    );
  });

  it('should return null if the url provided is not known', async () => {
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

  it('returns the corpus target if its syndicated', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
      url: 'https://getpocket.com/explore/item/why-exhaustion-is-not-unique-to-our-overstimulated-age',
    });

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(CORPUS_ITEM_TARGET_REFERENCE_RESOLVER),
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
    expect(result.body.data?._entities[0].title).toEqual(approvedItem.title);
    expect(result.body.data?._entities[0].target.slug).toEqual(
      'why-exhaustion-is-not-unique-to-our-overstimulated-age'
    );
    expect(result.body.data?._entities[0].target.__typename).toEqual(
      'SyndicatedArticle'
    );
  });

  it('returns the corpus target if its collection', async () => {
    // Create an approved item.
    const approvedItem = await createApprovedItemHelper(db, {
      title: 'Story one',
      url: 'https://getpocket.com/collections/avocado-toast-was-king-these-recipes-are-vying-for-the-throne',
    });

    const result = await request(app)
      .post(graphQLUrl)
      .send({
        query: print(CORPUS_ITEM_TARGET_REFERENCE_RESOLVER),
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
    expect(result.body.data?._entities[0].title).toEqual(approvedItem.title);
    expect(result.body.data?._entities[0].target.slug).toEqual(
      'avocado-toast-was-king-these-recipes-are-vying-for-the-throne'
    );
    expect(result.body.data?._entities[0].target.__typename).toEqual(
      'Collection'
    );
  });
});
