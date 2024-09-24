import request from 'supertest';
import { print } from 'graphql';

import { ProspectType } from 'content-common';
import { resetSnowplowEvents } from 'content-common/snowplow/test-helpers';
import {
  dbClient,
  Prospect,
  insertProspect,
  getProspectById,
  truncateDb,
} from 'prospectapi-common';

import { createProspect } from 'prospectapi-common/test/helpers';

import config from '../../config';

import { getTestServer } from '../../test/admin-server';
import { GET_PROSPECTS } from '../../test/admin-server/queries.gql';
import {
  UPDATE_PROSPECT_AS_CURATED,
  UPDATE_REMOVE_PROSPECT,
} from '../../test/admin-server/mutations.gql';
import { Context, MozillaAccessGroup } from '../../types';
import { ApolloServer } from '@apollo/server';

// These tests randomly break with "Exceeded timeout of 1500 ms for a hook" both locally
// and in CircleCI. Increasing timeout value
jest.setTimeout(30 * 1000);
jest.useRealTimers();

// convenience function to seed db
const seedDb = async () => {
  // plenty of NEW_TAB_EN_US / COUNTS not curated
  let prospect: Prospect;

  for (let i = 0; i < config.app.prospectBatchSize * 2; i++) {
    await insertProspect(
      dbClient,
      createProspect('NEW_TAB_EN_US', ProspectType.COUNTS),
    );
  }

  // half-batch of NEW_TAB_EN_US / TIMESPENT not curated
  for (let i = 0; i < config.app.prospectBatchSize / 2; i++) {
    prospect = createProspect('NEW_TAB_EN_US', ProspectType.TIMESPENT);

    // purposefully omit some optional data so we can verify this returns
    // as expected below
    delete prospect.excerpt;
    delete prospect.language;
    delete prospect.authors;

    await insertProspect(dbClient, prospect);
  }

  // plenty of NEW_TAB_DE_DE / GOBAL not curated
  for (let i = 0; i < config.app.prospectBatchSize * 2; i++) {
    await insertProspect(
      dbClient,
      createProspect('NEW_TAB_DE_DE', ProspectType.COUNTS),
    );
  }

  // NEW_TAB_EN_US / COUNTS curated - these should not be returned at all
  for (let i = 0; i < config.app.prospectBatchSize * 2; i++) {
    await insertProspect(
      dbClient,
      createProspect('NEW_TAB_EN_US', ProspectType.COUNTS, true),
    );
  }
};
describe('queries integration tests', () => {
  // we assign the auth groups that provide full access
  const headers = {
    name: 'test-user',
    username: 'test-user-name',
    groups: [
      MozillaAccessGroup.READONLY,
      MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL,
    ].join(),
  };

  let app: Express.Application;
  let apolloServer: ApolloServer<Context>;
  let url: string;

  beforeAll(async () => {
    await seedDb();
    ({ app, apolloServer, url } = await getTestServer(0));
  });

  afterAll(async () => {
    await truncateDb(dbClient);
    dbClient.destroy();
    await apolloServer.stop();
  });

  describe('getProspects', () => {
    it('should return all prospect properties', async () => {
      // this will give us 10 prospects
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              prospectType: ProspectType.COUNTS,
            },
          },
        });
      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;
      const resultArray = data?.getProspects;
      resultArray.forEach((item: Prospect) => {
        expect(item.id).toBeDefined();
        expect(item.scheduledSurfaceGuid).toBeDefined();
        expect(item.url).toBeDefined();
        expect(item.topic).toBeDefined();
        expect(item.prospectType).toBeDefined();
        expect(item.saveCount).toBeDefined();
        expect(item.createdAt).toBeDefined();
        expect(item.domain).toBeDefined();
        expect(item.imageUrl).toBeDefined();
        expect(item.publisher).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.isSyndicated).toBeDefined();
        expect(item.isCollection).toBeDefined();
        expect(item.excerpt).toBeDefined();
        expect(item.language).toBeDefined();
        expect(item.authors).toBeDefined();
        // Federated Approved Corpus Item
        expect(item.approvedCorpusItem).toBeDefined();
        // `url` is the only field that is resolved locally
        expect(item.approvedCorpusItem?.url).toBeDefined();
      });
    });

    it('should return all prospect properties, even undefined ones', async () => {
      // this will give us 10 prospects, some of which are missing optional
      // attributes - language, excerpt, and authors
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              prospectType: ProspectType.TIMESPENT,
            },
          },
        });
      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;

      const resultArray = data?.getProspects;

      resultArray.forEach((item: Prospect) => {
        expect(item.id).toBeDefined();
        expect(item.scheduledSurfaceGuid).toBeDefined();
        expect(item.url).toBeDefined();
        expect(item.topic).toBeDefined();
        expect(item.prospectType).toBeDefined();
        expect(item.saveCount).toBeDefined();
        expect(item.createdAt).toBeDefined();
        expect(item.domain).toBeDefined();
        expect(item.imageUrl).toBeDefined();
        expect(item.publisher).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.isSyndicated).toBeDefined();
        expect(item.isCollection).toBeDefined();
        // Federated Approved Corpus Item
        expect(item.approvedCorpusItem).toBeDefined();
        // `url` is the only field that is resolved locally
        expect(item.approvedCorpusItem?.url).toBeDefined();

        // these are purposefully removed in seedDb() above
        expect(item.excerpt).toBeNull();
        expect(item.language).toBeNull();
        expect(item.authors).toBeNull();
      });
    });

    it('should return a full batch filtered by new tab', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
            },
          },
        });

      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;
      const resultArray = data?.getProspects;

      // all prospects should be NEW_TAB_EN_US
      const enUsCount = resultArray.reduce((counter, result) => {
        return (
          counter + (result.scheduledSurfaceGuid === 'NEW_TAB_EN_US' ? 1 : 0)
        );
      }, 0);

      expect(enUsCount).toEqual(resultArray.length);
    });

    it('should return a full batch filtered by new tab and prospect type', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              prospectType: ProspectType.COUNTS,
            },
          },
        });
      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;

      const resultArray = data?.getProspects;

      // all prospects should be NEW_TAB_EN_US/COUNTS
      const validCount = resultArray.reduce((counter, result) => {
        if (
          result.scheduledSurfaceGuid === 'NEW_TAB_EN_US' &&
          result.prospectType === ProspectType.COUNTS
        ) {
          return counter + 1;
        } else {
          return counter;
        }
      }, 0);

      expect(validCount).toEqual(resultArray.length);
    });

    it('should return a partial batch filtered by publisher (included)', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              // A partial but case-sensitive match for The Atlantic
              includePublisher: 'Atlant',
            },
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const resultArray = result.body.data?.getProspects;

      // all returned prospects should be from The Atlantic
      const resultCount = resultArray.reduce(
        (counter, current) =>
          current.publisher === 'The Atlantic' ? ++counter : counter,
        0,
      );

      expect(resultCount).toEqual(resultArray.length);
    });

    it('should return a partial batch filtered by publisher (excluded)', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              // A partial but case-sensitive match for The New York Times
              excludePublisher: 'New',
            },
          },
        });
      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;

      const resultArray = data?.getProspects;

      // all returned prospects should be from The Atlantic
      const resultCount = resultArray.reduce(
        (counter, current) =>
          current.publisher !== 'The New York Times' ? ++counter : counter,
        0,
      );

      expect(resultCount).toEqual(resultArray.length);
    });

    it('should return less than a full batch when limited items exist', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              prospectType: ProspectType.TIMESPENT,
            },
          },
        });

      expect(result.body.errors).toBeUndefined();
      const {
        body: { data },
      } = result;

      const resultArray = data?.getProspects;

      // all prospects should be NEW_TAB_EN_US/TIMESPENT
      const validCount = resultArray.reduce((counter, result) => {
        if (
          result.scheduledSurfaceGuid === 'NEW_TAB_EN_US' &&
          result.prospectType === ProspectType.TIMESPENT
        ) {
          return counter + 1;
        } else {
          return counter;
        }
      }, 0);

      expect(validCount).toEqual(resultArray.length);
    });

    it('should throw an error if given an invalid new tab', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_CY_GB', // Welsh - probably safe for the foreseeable future
            },
          },
        });

      expect(result.body.errors?.length).toEqual(1);

      // this *should* always be true - but I couldn't figure out how to access
      // a specific index of a possibly undefined array
      if (result.body.errors) {
        expect(result.body.errors[0].message).toEqual(
          "NEW_TAB_CY_GB isn't a valid scheduled surface guid!",
        );
      }
    });

    it('should throw an error if given an invalid prospect type', async () => {
      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_DE_DE',
              prospectType: ProspectType.RECOMMENDED,
            },
          },
        });

      // we should get an error
      expect(result.body.errors?.length).toEqual(1);

      // this *should* always be true - but i couldn't figure out how to access
      // a specific index of a possibly undefined array

      expect(result?.body.errors?.[0].message).toEqual(
        'RECOMMENDED is not a valid prospect type for scheduled surface New Tab (de-DE)',
      );
    });
    it('should throw an error if the user does not have the required auth group for a given scheduled surface', async () => {
      // we assign auth group for the DE_DE scheduled surface
      const unAuthorizedHeaders = {
        ...headers,
        groups: MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
      };

      // the request we make is for EN_US scheduled surface
      const result = await request(app)
        .post(url)
        .set(unAuthorizedHeaders)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
              prospectType: ProspectType.RECOMMENDED,
            },
          },
        });

      // we should get an authorization error
      expect(result.body.errors).not.toBeUndefined();

      expect(result.body.errors?.length).toEqual(1);

      expect(result?.body.errors?.[0].message).toEqual(
        'Not authorized for action',
      );
    });
    it('should not return any prospects if request header groups are missing', async () => {
      // destructure groups to remove it from baseHeaders
      const { groups, ...undefinedGroupsHeaders } = {
        ...headers,
      };
      expect(groups).toBeDefined();

      // the request we make is for EN_US scheduled surface
      const result = await request(app)
        .post(url)
        .set(undefinedGroupsHeaders)
        .send({
          query: print(GET_PROSPECTS),
          variables: {
            filters: {
              scheduledSurfaceGuid: 'NEW_TAB_EN_US',
            },
          },
        });
      // we should get an authorization error
      expect(result.body.errors).not.toBeUndefined();

      expect(result.body.data).toBeNull();

      expect(result.body.errors?.length).toEqual(1);

      expect(result?.body.errors?.[0].message).toEqual(
        'Not authorized for action',
      );
    });
  });
});

describe('mutations integration tests', () => {
  const headers = {
    name: 'test-user',
    username: 'test-user-name',
    groups: [
      MozillaAccessGroup.READONLY,
      MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL,
    ].join(),
  };

  let app: Express.Application;
  let apolloServer: ApolloServer<Context>;
  let url: string;

  beforeAll(async () => {
    jest.setTimeout(15 * 1000);
    await truncateDb(dbClient);
    ({ app, apolloServer, url } = await getTestServer(0));
  });

  afterAll(async () => {
    await dbClient.destroy();
    await apolloServer.stop();
  });

  afterEach(async () => {
    await truncateDb(dbClient);
  });

  describe('updateProspectAsCurated', () => {
    it('should updated a prospect as curated', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_PROSPECT_AS_CURATED),
          variables: {
            id: prospect.id,
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toEqual(true);
    });

    it('should return all properties of an updated prospect', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_PROSPECT_AS_CURATED),
          variables: {
            id: prospect.id,
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const updatedProspect = result.body.data?.updateProspectAsCurated;

      // internal Prospect type differs from graph Prospect type
      // curated and rank are not exposed via public graph, redact from expectations
      const expectedProspect: any = { ...prospect };
      delete expectedProspect.curated;
      delete expectedProspect.rank;
      // add expected federated fields that are on graphql schema
      expectedProspect.approvedCorpusItem = { url: expectedProspect.url };

      expect(updatedProspect).toEqual(expectedProspect);
    });

    it('should update prospect if the user has the required auth group for a given scheduled surface', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_PROSPECT_AS_CURATED),
          variables: {
            id: prospect.id,
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toEqual(true);
    });
    it('should throw an error if the user does not have the required auth group for a given scheduled surface', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const unAuthorizedHeaders = {
        ...headers,
        groups: MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
      };

      const result = await request(app)
        .post(url)
        .set(unAuthorizedHeaders)
        .send({
          query: print(UPDATE_PROSPECT_AS_CURATED),
          variables: {
            id: prospect.id,
          },
        });

      expect(result.body.errors).not.toBeUndefined();

      expect(result.body.errors?.length).toEqual(1);

      expect(result?.body.errors?.[0].message).toEqual(
        'Not authorized for action',
      );
    });
  });
  /*
  these are currently largely a copy of the dismissProspect tests above. once
  removeProspect is adopted by the curation tools, we will be removing the
  dismissProspect mutation and all related tests.
  Update: 01.30.2024 - dismissProspect mutation has been removed
  */
  describe('removeProspect', () => {
    afterEach(async () => {
      // we need to clear the snowplow events here otherwise the
      // snowplow integration tests may fail
      await resetSnowplowEvents();
    });

    it('should update a prospect as curated without any reason', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
            },
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toEqual(true);
    });

    it('should update a prospect as curated with a single status reason and no comment', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
              reasons: 'PUBLISHER',
            },
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toEqual(true);
    });

    it('should update a prospect as curated with multiple status reasons and comment', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
              reasons: 'PUBLISHER,TOPIC',
              reasonComment: 'publisher and topic spread were not good enough',
            },
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toEqual(true);
    });

    it('should return all properties of a removed prospect', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
              reasons: 'PUBLISHER',
            },
          },
        });

      // check these first just in case
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data).not.toBeNull();

      const updatedProspect = result.body.data?.removeProspect;

      // internal Prospect type differs from graph Prospect type
      // curated and rank are not exposed via public graph, redact from expectations
      const expectedProspect: any = { ...prospect };
      delete expectedProspect.curated;
      delete expectedProspect.rank;
      // add expected federated fields that are on graphql schema
      expectedProspect.approvedCorpusItem = { url: expectedProspect.url };

      expect(updatedProspect).toEqual(expectedProspect);
    });

    it('should update prospect if the user has the required auth group for a given scheduled surface', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const result = await request(app)
        .post(url)
        .set(headers)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
              reasons: 'PUBLISHER',
            },
          },
        });

      expect(result.body.errors).toBeUndefined();

      expect(result.body.data).not.toBeNull();

      // get the prospect directly from the db (as `curated` is not a part of
      // our graph)
      const res = await getProspectById(dbClient, prospect.id);

      expect(res?.curated).toBeTruthy();
    });

    it('should throw an error if the user does not have the required auth group for a given scheduled surface', async () => {
      const prospect = createProspect(
        'NEW_TAB_EN_US',
        ProspectType.RECOMMENDED,
        false,
      );

      await insertProspect(dbClient, prospect);

      const unAuthorizedHeaders = {
        ...headers,
        groups: MozillaAccessGroup.NEW_TAB_CURATOR_DEDE,
      };

      const result = await request(app)
        .post(url)
        .set(unAuthorizedHeaders)
        .send({
          query: print(UPDATE_REMOVE_PROSPECT),
          variables: {
            data: {
              id: prospect.id,
              reasons: 'PUBLISHER',
            },
          },
        });

      expect(result.body.errors).not.toBeUndefined();
      expect(result.body.errors?.length).toEqual(1);
      expect(result?.body.errors?.[0].message).toEqual(
        'Not authorized for action',
      );
    });
  });
});
