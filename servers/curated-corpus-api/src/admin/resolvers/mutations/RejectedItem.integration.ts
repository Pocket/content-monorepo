import { expect } from 'chai';
import sinon from 'sinon';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
import { client } from '../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createRejectedCuratedCorpusItemHelper,
} from '../../../test/helpers';
import { CREATE_REJECTED_ITEM } from './sample-mutations.gql';
import { CreateRejectedItemInput } from '../../../database/types';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../events/init';
import { ReviewedCorpusItemEventType } from '../../../events/types';
import { ACCESS_DENIED_ERROR, MozillaAccessGroup } from '../../../shared/types';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('mutations: RejectedItem', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  const baseHeaders = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };
  // set default headers for tests that don't modify headers
  const headers = { ...baseHeaders };

  beforeEach(async () => {
    await clearDb(db);
  });

  describe('createRejectedCorpusItem mutation', () => {
    // a standard set of inputs for this mutation
    let input: CreateRejectedItemInput;

    beforeEach(() => {
      // re-set input for each test (as tests may alter input)
      input = {
        prospectId: '123-abc',
        url: 'https://test.com/docker',
        title: 'Find Out How I Cured My Docker In 2 Days',
        topic: 'Technology',
        language: 'DE',
        publisher: 'Convective Cloud',
        reason: 'MISINFORMATION,OTHER',
      };
    });

    it('creates a rejected item with all inputs supplied', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data).to.not.be.null;

      // Expect to see all the input data we supplied in the Approved Item
      // returned by the mutation
      expect(result.body.data?.createRejectedCorpusItem).to.deep.include(input);
      // Expect to see the SSO username in the `createdBy` field
      expect(result.body.data?.createRejectedCorpusItem.createdBy).to.equal(
        headers.username
      );

      // Check that the REJECT_ITEM event was fired successfully:
      // 1 - Event was fired once.
      expect(eventTracker.callCount).to.equal(1);
      // 2 - Event has the right type.
      expect(await eventTracker.getCall(0).args[0].eventType).to.equal(
        ReviewedCorpusItemEventType.REJECT_ITEM
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.getCall(0).args[0].reviewedCorpusItem.externalId
      ).to.equal(result.body.data?.createRejectedCorpusItem.externalId);
    });

    it('creates a rejected item without a prospectId', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      const inputWithoutProspectId = { ...input };
      delete inputWithoutProspectId.prospectId;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: inputWithoutProspectId },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data).to.not.be.null;

      // Expect to see all the input data we supplied in the Approved Item
      // returned by the mutation
      expect(result.body.data?.createRejectedCorpusItem).to.deep.include(
        inputWithoutProspectId
      );
      // Expect to see the SSO username in the `createdBy` field
      expect(result.body.data?.createRejectedCorpusItem.createdBy).to.equal(
        headers.username
      );

      // Check that the REJECT_ITEM event was fired successfully:
      // 1 - Event was fired once.
      expect(eventTracker.callCount).to.equal(1);
      // 2 - Event has the right type.
      expect(await eventTracker.getCall(0).args[0].eventType).to.equal(
        ReviewedCorpusItemEventType.REJECT_ITEM
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.getCall(0).args[0].reviewedCorpusItem.externalId
      ).to.equal(result.body.data?.createRejectedCorpusItem.externalId);
    });

    it('should create a rejected item if the user has access to at least one of the scheduled surfaces', async () => {
      const headers = {
        ...baseHeaders,
        groups: `group-1,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data).to.not.be.null;

      // Expect to see all the input data we supplied in the Approved Item
      // returned by the mutation
      expect(result.body.data?.createRejectedCorpusItem).to.deep.include(input);
    });

    it('should fail to create a rejected item with a duplicate URL', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      // Create a rejected item with a set URL
      await createRejectedCuratedCorpusItemHelper(db, {
        title: 'I was here first!',
        url: 'https://test.com/docker',
      });

      // Attempt to create another item with the same URL
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      // ...without success. There is no data
      expect(result.body.errors).to.not.be.undefined;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `A rejected item with the URL "${input.url}" already exists.`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );

      // Check that the REJECT_ITEM event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should fail to create a rejected item if URL is in approved corpus', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

      // Create an approved item with a set URL
      await createApprovedItemHelper(db, {
        title: 'I was here first!',
        url: 'https://test.com/docker',
      });

      // Attempt to create another item with the same URL
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      // ...without success. There is no data
      expect(result.body.errors).to.not.be.undefined;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `An approved item with the URL "${input.url}" already exists.`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );

      // Check that the REJECT_ITEM event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should throw an error if user has read-only access', async () => {
      const headers = { ...baseHeaders, groups: MozillaAccessGroup.READONLY };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;
      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error if the user does not have any scheduled surface access', async () => {
      const headers = {
        ...baseHeaders,
        groups: 'group-1, group-2',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should throw an error if the request header groups are undefined', async () => {
      // destructure groups to remove it from baseHeaders
      const { groups, ...headers } = {
        ...baseHeaders,
      };
      // expect whatever to avoid unused eslint error
      expect(groups).to.exist;

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should succeed with spaces in rejection reasons', async () => {
      input.reason = ' MISINFORMATION, OTHER ';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data).to.not.be.null;
    });

    it('should fail when given an invalid rejection reason', async () => {
      input.reason = 'BADFONT';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.data).to.be.null;

      expect(result.body.errors?.[0].message).to.contain(
        ` is not a valid rejection reason.`
      );
    });

    it('should fail when given invalid rejection reasons', async () => {
      input.reason = 'BADFONT,BORINGCOLORS';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.data).to.be.null;

      expect(result.body.errors?.[0].message).to.contain(
        ` is not a valid rejection reason.`
      );
    });

    it('should fail when given valid and invalid rejection reasons', async () => {
      input.reason = 'MISINFORMATION,IDONTLIKEIT';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.data).to.be.null;

      expect(result.body.errors?.[0].message).to.contain(
        ` is not a valid rejection reason.`
      );
    });

    it('should fail if language code is outside of allowed values', async () => {
      input.language = 'ZZ';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.data).to.be.undefined;

      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );
      expect(result.body.errors?.[0].message).to.contain(
        'does not exist in "CorpusLanguage" enum.'
      );
    });

    it('should fail if language code is correct but not in upper case', async () => {
      input.language = 'de';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });

      expect(result.body.errors).to.not.be.undefined;
      expect(result.body.data).to.be.undefined;
      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );
      expect(result.body.errors?.[0].message).to.contain(
        'does not exist in "CorpusLanguage" enum.'
      );
    });

    it('should succeed if language code (English) is correct and upper case', async () => {
      input.language = 'EN';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).to.be.undefined;
      const data = result.body.data;
      expect(data.createRejectedCorpusItem.language).to.equal('EN');
    });

    it('should succeed if language code (Deutsch) is correct and upper case', async () => {
      input.language = 'DE';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).to.be.undefined;
      const data = result.body.data;
      expect(data.createRejectedCorpusItem.language).to.equal('DE');
    });

    it('should succeed if language code (Italian) is correct and upper case', async () => {
      input.language = 'IT';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).to.be.undefined;
      const data = result.body.data;
      expect(data.createRejectedCorpusItem.language).to.equal('IT');
    });

    it('should succeed if language code (Spanish) is correct and upper case', async () => {
      input.language = 'ES';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).to.be.undefined;
      const data = result.body.data;
      expect(data.createRejectedCorpusItem.language).to.equal('ES');
    });

    it('should succeed if language code (French) is correct and upper case', async () => {
      input.language = 'FR';

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_REJECTED_ITEM),
          variables: { data: input },
        });
      // Good to check for any errors before proceeding with the rest of the test
      expect(result.body.errors).to.be.undefined;
      const data = result.body.data;
      expect(data.createRejectedCorpusItem.language).to.equal('FR');
    });
  });
});
