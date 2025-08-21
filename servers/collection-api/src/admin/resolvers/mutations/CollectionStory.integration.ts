import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../../../database/client';

import { getCollectionStory } from '../../../database/queries';
import {
  CreateCollectionStoryInput,
  UpdateCollectionStoryInput,
} from '../../../database/types';
import {
  clear as clearDb,
  createAuthorHelper,
  createCollectionHelper,
} from '../../../test/helpers';
import { COLLECTION_CURATOR_FULL } from '../../../shared/constants';
import {
  CREATE_COLLECTION_STORY,
  UPDATE_COLLECTION_STORY,
  UPDATE_COLLECTION_STORY_SORT_ORDER,
  UPDATE_COLLECTION_STORY_IMAGE_URL,
  DELETE_COLLECTION_STORY,
} from './sample-mutations.gql';
import { createCollectionStory } from '../../../database/mutations/CollectionStory';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('mutations: CollectionStory', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${COLLECTION_CURATOR_FULL}`,
  };

  let author;
  let collection;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
  });

  afterAll(async () => {
    await db.$disconnect();
    await server.stop();
  });

  beforeEach(async () => {
    await clearDb(db);

    author = await createAuthorHelper(db, 'maude');

    collection = await createCollectionHelper(db, {
      title: 'a collection: by maude',
      author,
    });
  });

  describe('createCollectionStory', () => {
    let input: CreateCollectionStoryInput;

    beforeEach(async () => {
      input = {
        collectionExternalId: collection.externalId,
        url: 'https://www.lebowskifest.com/',
        title: 'lebowski fest',
        excerpt: 'when will the next fest be?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'little lebowskis',
      };
    });

    it('should create a collection story', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const story = result.body.data.createCollectionStory;

      expect(story.url).toEqual(input.url);
      expect(story.title).toEqual(input.title);
      expect(story.excerpt).toEqual(input.excerpt);
      expect(story.imageUrl).toEqual(input.imageUrl);
      expect(story.authors.length).toEqual(input.authors.length);
      expect(story.publisher).toEqual(input.publisher);

      // default sort order of 0 should be there
      expect(result.body.data.createCollectionStory.sortOrder).toEqual(0);
    });

    it('should create a collection story with a default sort order', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      // default sort order of 0 should be there
      expect(result.body.data.createCollectionStory.sortOrder).toEqual(0);
    });

    it('should create a collection story with a default `fromPartner` value', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      // default 'fromPartner' value of 'false' should be present
      expect(result.body.data.createCollectionStory.fromPartner).toEqual(false);
    });

    it('should return story authors sorted correctly', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const story = result.body.data.createCollectionStory;

      // (authors are returned sorted by sortOrder asc)
      expect(story.authors[0].name).toEqual('donny');
      expect(story.authors[1].name).toEqual('walter');

      // default sort order of 0 should be there
      expect(story.sortOrder).toEqual(0);
    });

    it('should create a collection story with a sort order', async () => {
      input.sortOrder = 4;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const story = result.body.data.createCollectionStory;

      expect(story.sortOrder).toEqual(4);
    });

    it('should create a collection story with no authors', async () => {
      input.authors = [];

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const story = result.body.data.createCollectionStory;

      expect(story).toBeTruthy();
      expect(story.authors.length).toEqual(0);
    });

    it('should fail adding the same url to the same collection', async () => {
      await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });

      expect(result.body.errors.length).toEqual(1);
      expect(result.body.errors[0].message).toEqual(
        `A story with the url "${input.url}" already exists in this collection`,
      );
    });

    it('should add a url that already exists in a different collection', async () => {
      // add the default story to the default collection
      const result1 = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });
      const dataStory1 = result1.body.data;

      // create a second collection
      const collection2 = await createCollectionHelper(db, {
        title: 'a collection: by walter',
        author,
      });

      // update the collection in the create data to reference the second collection
      input.collectionExternalId = collection2.externalId;

      // add the same default story to the second collection
      const result2 = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_COLLECTION_STORY),
          variables: { data: input },
        });
      const dataStory2 = result2.body.data;

      // the urls should be the same
      expect(dataStory2.createCollectionStory.url).toEqual(
        dataStory1.createCollectionStory.url,
      );
    });
  });

  describe('updateCollectionStory', () => {
    let story;

    beforeEach(async () => {
      const data: CreateCollectionStoryInput = {
        collectionExternalId: collection.externalId,
        url: 'https://www.lebowskifest.com/',
        title: 'lebowski fest',
        excerpt: 'when will the next fest be?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'little lebowskis',
        sortOrder: 4,
        fromPartner: false,
      };

      story = await createCollectionStory(db, data);
    });

    it('should update a collection story', async () => {
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: story.url, // not updating the URL here
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: 'new image url',
        authors: [
          { name: 'brandt', sortOrder: 1 },
          { name: 'karl', sortOrder: 2 },
        ],
        publisher: 'the cast',
        sortOrder: 3,
        fromPartner: true,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const updated = result.body.data.updateCollectionStory;

      expect(updated.url).toEqual(story.url);
      expect(updated.title).toEqual(input.title);
      expect(updated.excerpt).toEqual(input.excerpt);
      expect(updated.imageUrl).toEqual(input.imageUrl);
      expect(updated.publisher).toEqual(input.publisher);
      expect(updated.sortOrder).toEqual(input.sortOrder);
    });

    it('should update the collection story authors and return them properly sorted', async () => {
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: 'https://www.lebowskifest.com/bowling',
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: 'new image url',
        authors: [
          { name: 'brandt', sortOrder: 1 },
          { name: 'karl', sortOrder: 2 },
          { name: 'maude', sortOrder: 6 },
        ],
        publisher: 'the cast',
        sortOrder: 3,
        fromPartner: false,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      const updated = result.body.data.updateCollectionStory;

      expect(updated.authors.length).toEqual(3);
      // (authors are returned sorted by sortOrder asc)
      expect(updated.authors[0].name).toEqual('brandt');
      expect(updated.authors[1].name).toEqual('karl');
      expect(updated.authors[2].name).toEqual('maude');
    });

    it('should update a collection story with no authors', async () => {
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: 'https://www.lebowskifest.com/bowling',
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: 'new image url',
        authors: [],
        publisher: 'the cast',
        sortOrder: 3,
        fromPartner: false,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      expect(result.body.data.updateCollectionStory.authors.length).toEqual(0);
    });

    it('should update a collection story URL as long as it does not already exist', async () => {
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: 'https://openpuppies.com/',
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: 'new image url',
        authors: [
          { name: 'brandt', sortOrder: 1 },
          { name: 'karl', sortOrder: 2 },
        ],
        publisher: 'the cast',
        sortOrder: 3,
        fromPartner: false,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      expect(result.body.data.updateCollectionStory.url).toEqual(input.url);
    });

    it('should fail updating to a url that already exists in the same collection', async () => {
      // Create another story first
      const createData: CreateCollectionStoryInput = {
        collectionExternalId: collection.externalId,
        url: 'https://www.anything-goes.com/',
        title: 'anything goes',
        excerpt: 'why would this even be a thing?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'random penguin',
        sortOrder: 5,
        fromPartner: false,
      };

      await createCollectionStory(db, createData);

      // Update the test story with the newly added story's URL
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: createData.url,
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: '',
        authors: [
          { name: 'brandt', sortOrder: 1 },
          { name: 'karl', sortOrder: 2 },
        ],
        publisher: 'random penguin',
        sortOrder: 1,
        fromPartner: false,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      expect(result.body.errors.length).toEqual(1);

      expect(result.body.errors[0].message).toEqual(
        `A story with the url "${input.url}" already exists in this collection`,
      );
    });

    it('should update to a url that already exists in a different collection', async () => {
      // create a new collection
      const collection2 = await createCollectionHelper(db, {
        title: 'a collection: by walter',
        author,
      });

      // create a story in the new collection
      const createData: CreateCollectionStoryInput = {
        collectionExternalId: collection2.externalId,
        url: 'https://www.anything-goes.com/',
        title: 'anything goes',
        excerpt: 'why would this even be a thing?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'random penguin',
        sortOrder: 5,
        fromPartner: false,
      };

      await createCollectionStory(db, createData);

      // Update the test story with the newly added story's URL
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: 'https://www.anything-goes.com/',
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: '',
        authors: [
          { name: 'brandt', sortOrder: 1 },
          { name: 'karl', sortOrder: 2 },
        ],
        publisher: 'random penguin',
        sortOrder: 1,
        fromPartner: false,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      expect(result.body.data.updateCollectionStory.url).toEqual(input.url);
    });

    it('should allow updates with optional fields omitted in input data', async () => {
      const input: UpdateCollectionStoryInput = {
        externalId: story.externalId,
        url: 'https://www.lebowskifest.com/bowling',
        title: 'a fest of lebowskis',
        excerpt: 'new excerpt',
        imageUrl: 'new image url',
        authors: [],
        publisher: 'the cast',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY),
          variables: { data: input },
        });

      // The two optional fields should stay as they are
      expect(result.body.data.updateCollectionStory.sortOrder).toEqual(
        story.sortOrder,
      );
      expect(result.body.data.updateCollectionStory.fromPartner).toEqual(
        story.fromPartner,
      );
    });
  });

  describe('updateCollectionStorySortOrder', () => {
    let story;

    beforeEach(async () => {
      const data: CreateCollectionStoryInput = {
        collectionExternalId: collection.externalId,
        url: 'https://www.lebowskifest.com/',
        title: 'lebowski fest',
        excerpt: 'when will the next fest be?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'little lebowskis',
        sortOrder: 4,
        fromPartner: false,
      };

      story = await createCollectionStory(db, data);
    });

    it('should update the sortOrder of a collection story', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY_SORT_ORDER),
          variables: {
            data: {
              externalId: story.externalId,
              sortOrder: story.sortOrder + 1,
            },
          },
        });

      expect(result.body.data.updateCollectionStorySortOrder.sortOrder).toEqual(
        story.sortOrder + 1,
      );
    });

    it('should not update any other properties when updating sortOrder', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY_SORT_ORDER),
          variables: {
            data: {
              externalId: story.externalId,
              sortOrder: story.sortOrder + 1,
            },
          },
        });

      const updated = result.body.data.updateCollectionStorySortOrder;

      expect(updated.title).toEqual(story.title);
      expect(updated.url).toEqual(story.url);
      expect(updated.excerpt).toEqual(story.excerpt);
      expect(updated.imageUrl).toEqual(story.imageUrl);
      expect(updated.authors.length).toEqual(story.authors.length);
      expect(updated.publisher).toEqual(story.publisher);
    });
  });

  describe('updateCollectionStoryImageUrl', () => {
    let story;

    beforeEach(async () => {
      const data: CreateCollectionStoryInput = {
        collectionExternalId: collection.externalId,
        url: 'https://www.lebowskifest.com/',
        title: 'lebowski fest',
        excerpt: 'when will the next fest be?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'little lebowskis',
        sortOrder: 4,
        fromPartner: false,
      };

      story = await createCollectionStory(db, data);
    });

    it('should update the imageUrl of a collection story', async () => {
      const randomKitten = 'https://placekitten.com/g/200/300';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY_IMAGE_URL),
          variables: {
            data: {
              externalId: story.externalId,
              imageUrl: randomKitten,
            },
          },
        });

      expect(result.body.data.updateCollectionStoryImageUrl.imageUrl).toEqual(
        randomKitten,
      );
    });

    it('should not update any other properties when updating sortOrder', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_COLLECTION_STORY_IMAGE_URL),
          variables: {
            data: {
              externalId: story.externalId,
              imageUrl: 'https://placekitten.com/g/200/300',
            },
          },
        });

      expect(result.body.data.updateCollectionStoryImageUrl.title).toEqual(
        story.title,
      );
      expect(result.body.data.updateCollectionStoryImageUrl.url).toEqual(
        story.url,
      );
      expect(result.body.data.updateCollectionStoryImageUrl.excerpt).toEqual(
        story.excerpt,
      );
      expect(result.body.data.updateCollectionStoryImageUrl.sortOrder).toEqual(
        story.sortOrder,
      );
      expect(
        result.body.data.updateCollectionStoryImageUrl.authors.length,
      ).toEqual(story.authors.length);
      expect(result.body.data.updateCollectionStoryImageUrl.publisher).toEqual(
        story.publisher,
      );
    });
  });

  describe('deleteCollectionStory', () => {
    let story;

    beforeEach(async () => {
      const data: CreateCollectionStoryInput = {
        collectionExternalId: collection.externalId,
        url: 'https://www.lebowskifest.com/',
        title: 'lebowski fest',
        excerpt: 'when will the next fest be?',
        imageUrl: 'idk',
        authors: [
          { name: 'donny', sortOrder: 1 },
          { name: 'walter', sortOrder: 2 },
        ],
        publisher: 'little lebowskis',
        sortOrder: 4,
        fromPartner: false,
      };

      story = await createCollectionStory(db, data);
    });

    it('should delete a collection story and return the deleted data', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_COLLECTION_STORY),
          variables: {
            externalId: story.externalId,
          },
        });

      // should have direct model data
      expect(result.body.data.deleteCollectionStory.title).toEqual(story.title);

      // should have related author data
      expect(
        result.body.data.deleteCollectionStory.authors.length,
      ).toBeGreaterThan(0);

      // make sure the story is really gone
      const found = await getCollectionStory(db, story.externalId);

      expect(found).toBeNull();
    });

    it('should delete a collection story and return the story authors sorted correctly', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_COLLECTION_STORY),
          variables: {
            externalId: story.externalId,
          },
        });

      // (authors are returned sorted by sortOrder asc)
      expect(result.body.data.deleteCollectionStory.authors[0].name).toEqual(
        'donny',
      );
      expect(result.body.data.deleteCollectionStory.authors[1].name).toEqual(
        'walter',
      );
    });

    it('should delete all related collection story authors', async () => {
      await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_COLLECTION_STORY),
          variables: {
            externalId: story.externalId,
          },
        });

      const relatedAuthors = db.collectionStoryAuthor.findMany({
        where: {
          collectionStoryId: story.id,
        },
      });

      expect((await relatedAuthors).length).toEqual(0);
    });

    it('should fail to delete a collection story if the externalId cannot be found', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_COLLECTION_STORY),
          variables: {
            externalId: story.externalId + 'typo',
          },
        });

      expect(result.body.errors.length).toEqual(1);

      expect(result.body.errors[0].message).toEqual(
        `Cannot delete a collection story with external ID "${story.externalId}typo"`,
      );
    });
  });
});
