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
  createScheduledItemHelper,
} from '../../../test/helpers';
import {
  CREATE_SCHEDULED_ITEM,
  DELETE_SCHEDULED_ITEM,
  RESCHEDULE_SCHEDULED_ITEM,
} from './sample-mutations.gql';
import {
  CreateScheduledItemInput,
  DeleteScheduledItemInput,
  RescheduleScheduledItemInput,
} from '../../../database/types';
import { getUnixTimestamp } from '../fields/UnixTimestamp';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../events/init';
import { ScheduledCorpusItemEventType } from '../../../events/types';
import { DateTime } from 'luxon';
import { ACCESS_DENIED_ERROR, MozillaAccessGroup } from '../../../shared/types';
import { startServer } from '../../../express';
import { IAdminContext } from '../../context';

describe('mutations: ScheduledItem', () => {
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

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeEach(async () => {
    await clearDb(db);
  });

  describe('createScheduledCorpusItem mutation', () => {
    it('should fail on invalid Scheduled Surface GUID', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'A test story',
      });
      const input: CreateScheduledItemInput = {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid: 'RECSAPI',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;
      expect(result.body.errors).to.not.be.undefined;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `Cannot create a scheduled entry with Scheduled Surface GUID of "RECSAPI".`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );

      // Check that the ADD_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should fail on invalid Approved Item ID', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

      const input: CreateScheduledItemInput = {
        approvedItemExternalId: 'not-a-valid-id-at-all',
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `Cannot create a scheduled entry: Approved Item with id "not-a-valid-id-at-all" does not exist.`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal('NOT_FOUND');

      // Check that the ADD_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should fail if story is already scheduled for given Scheduled Surface/date combination', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

      // create a sample curated item
      const item = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      // create a scheduled entry for this item
      const existingScheduledEntry = await createScheduledItemHelper(db, {
        approvedItem: item,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      });

      // This is the date format for the GraphQL mutation.
      const scheduledDate = DateTime.fromJSDate(
        existingScheduledEntry.scheduledDate,
        { zone: 'utc' }
      ).toFormat('yyyy-MM-dd');

      // And this human-readable (and cross-locale understandable) format
      // is used in the error message we're anticipating to get.
      const displayDate = DateTime.fromJSDate(
        existingScheduledEntry.scheduledDate,
        { zone: 'utc' }
      ).toFormat('MMM d, y');

      // Set up the input for the mutation that contains the exact same values
      // as the scheduled entry created above.
      const input: CreateScheduledItemInput = {
        approvedItemExternalId: item.externalId,
        scheduledSurfaceGuid: existingScheduledEntry.scheduledSurfaceGuid,
        scheduledDate,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      // Expecting to see a custom error message from the resolver
      expect(result.body.errors?.[0].message).to.contain(
        `This story is already scheduled to appear on NEW_TAB_EN_US on ${displayDate}.`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );

      // Check that the ADD_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should create an entry and return data (including Approved Item)', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.ADD_SCHEDULE, eventTracker);

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      const input: CreateScheduledItemInput = {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      const scheduledItem = result.body.data?.createScheduledCorpusItem;

      // Expect these fields to return valid values
      expect(scheduledItem.externalId).to.not.be.null;
      expect(scheduledItem.createdAt).to.not.be.null;
      expect(scheduledItem.updatedAt).to.not.be.null;
      expect(scheduledItem.createdBy).to.equal(headers.username);

      // Expect these to match the input values
      expect(new Date(scheduledItem.scheduledDate)).to.deep.equal(
        new Date(input.scheduledDate)
      );

      // Finally, let's compare the returned ApprovedItem object to our inputs.
      // Need to destructure timestamps and compare them separately
      // as Prisma will convert to ISO string for comparison
      // and GraphQL server returns Unix timestamps.
      const {
        createdAt,
        updatedAt,
        authors: approvedItemAuthors,
        ...otherApprovedItemProps
      } = approvedItem;
      const {
        createdAt: createdAtReturned,
        updatedAt: updatedAtReturned,
        authors: authorsReturned,
        ...otherReturnedApprovedItemProps
      } = scheduledItem.approvedItem;
      expect(getUnixTimestamp(createdAt)).to.equal(createdAtReturned);
      expect(getUnixTimestamp(updatedAt)).to.equal(updatedAtReturned);
      expect(otherApprovedItemProps).to.deep.include(
        otherReturnedApprovedItemProps
      );

      // check authors
      // note that approvedItemAuthors does not go through our graphql interface,
      // so it has *all* db properties, including externalId and approvedItemId.
      // these properties are *not* present in authorsReturned, so we need to do
      // a custom comparison
      if (approvedItemAuthors) {
        const approvedItemAuthorsMapped = approvedItemAuthors.map((aia) => {
          return {
            name: aia.name,
            sortOrder: aia.sortOrder,
          };
        });

        expect(approvedItemAuthorsMapped).to.deep.equal(authorsReturned);
      }

      // Check that the ADD_SCHEDULE event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker.callCount).to.equal(1);
      // 2 - Event has the right type.
      expect(await eventTracker.getCall(0).args[0].eventType).to.equal(
        ScheduledCorpusItemEventType.ADD_SCHEDULE
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.getCall(0).args[0].scheduledCorpusItem.externalId
      ).to.equal(scheduledItem.externalId);
    });

    it('should fail if user has read-only access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      const input: CreateScheduledItemInput = {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it("should fail if user doesn't have access to specified scheduled surface", async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      const input: CreateScheduledItemInput = {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should succeed if user has access to specified scheduled surface', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      const input: CreateScheduledItemInput = {
        approvedItemExternalId: approvedItem.externalId,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: '2100-01-01',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      // Hooray! There is data
      expect(result.body.data).to.not.be.null;

      // And no errors, too!
      expect(result.body.errors).to.be.undefined;
    });
  });

  describe('deleteScheduledCorpusItem mutation', () => {
    it('should fail on invalid external ID', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(
        ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
        eventTracker
      );

      const input: DeleteScheduledItemInput = {
        externalId: 'not-a-valid-ID-string',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `Item with ID of '${input.externalId}' could not be found.`
      );
      expect(result.body.errors?.[0].extensions?.code).to.equal('NOT_FOUND');

      // Check that the REMOVE_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should delete an item scheduled for a Scheduled Surface and return deleted data', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(
        ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
        eventTracker
      );

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SCHEDULED_ITEM),
          variables: { data: { externalId: scheduledItem.externalId } },
        });

      // The shape of the Prisma objects the above helpers return doesn't quite match
      // the type we return in GraphQL (for example, IDs stay internal, we attach an
      // ApprovedItem), so until there is a query to retrieve the scheduled item
      // of the right shape (if it's ever implemented), laborious property-by-property
      // comparison is the go.
      const returnedItem = result.body.data?.deleteScheduledCorpusItem;
      expect(returnedItem.externalId).to.equal(scheduledItem.externalId);
      expect(returnedItem.createdBy).to.equal(scheduledItem.createdBy);
      expect(returnedItem.updatedBy).to.equal(headers.username);

      expect(returnedItem.createdAt).to.equal(
        getUnixTimestamp(scheduledItem.createdAt)
      );
      expect(returnedItem.updatedAt).to.equal(
        getUnixTimestamp(scheduledItem.updatedAt)
      );

      expect(new Date(returnedItem.scheduledDate)).to.deep.equal(
        scheduledItem.scheduledDate
      );

      // Finally, let's compare the returned ApprovedItem object to our inputs.
      // Need to destructure timestamps and compare them separately
      // as Prisma will convert to ISO string for comparison
      // and GraphQL server returns Unix timestamps.
      const {
        createdAt,
        updatedAt,
        authors: approvedItemAuthors,
        ...otherApprovedItemProps
      } = approvedItem;
      const {
        createdAt: createdAtReturned,
        updatedAt: updatedAtReturned,
        authors: authorsReturned,
        ...otherReturnedApprovedItemProps
      } = returnedItem.approvedItem;
      expect(getUnixTimestamp(createdAt)).to.equal(createdAtReturned);
      expect(getUnixTimestamp(updatedAt)).to.equal(updatedAtReturned);
      expect(otherApprovedItemProps).to.deep.include(
        otherReturnedApprovedItemProps
      );

      // check authors
      // note that approvedItemAuthors does not go through our graphql interface,
      // so it has *all* db properties, including externalId and approvedItemId.
      // these properties are *not* present in authorsReturned, so we need to do
      // a custom comparison
      if (approvedItemAuthors) {
        const approvedItemAuthorsMapped = approvedItemAuthors.map((aia) => {
          return {
            name: aia.name,
            sortOrder: aia.sortOrder,
          };
        });

        expect(approvedItemAuthorsMapped).to.deep.equal(authorsReturned);
      }

      // Check that the REMOVE_SCHEDULE event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker.callCount).to.equal(1);
      // 2 - Event has the right type.
      expect(await eventTracker.getCall(0).args[0].eventType).to.equal(
        ScheduledCorpusItemEventType.REMOVE_SCHEDULE
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.getCall(0).args[0].scheduledCorpusItem.externalId
      ).to.equal(scheduledItem.externalId);
    });

    it('should fail if user has read-only access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SCHEDULED_ITEM),
          variables: { data: { externalId: scheduledItem.externalId } },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it("should fail if user doesn't have access to specified scheduled surface", async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SCHEDULED_ITEM),
          variables: { data: { externalId: scheduledItem.externalId } },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should succeed if user has access to specified scheduled surface', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SCHEDULED_ITEM),
          variables: { data: { externalId: scheduledItem.externalId } },
        });

      // Hooray! There is data
      expect(result.body.data).to.not.be.null;

      // And no errors, too!
      expect(result.body.errors).to.be.undefined;
    });
  });

  describe('rescheduleScheduledCorpusItem mutation', () => {
    it('should fail on invalid external ID', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

      const input: RescheduleScheduledItemInput = {
        externalId: 'not-a-valid-ID-string',
        scheduledDate: '2050-05-04',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      // And there is the correct error from the resolvers
      expect(result.body.errors?.[0].message).to.contain(
        `Item with ID of '${input.externalId}' could not be found.`
      );

      expect(result.body.errors?.[0].extensions?.code).to.equal('NOT_FOUND');

      // Check that the REMOVE_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should reschedule an item scheduled for a Scheduled Surface and return updated data', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date(2050, 4, 4).toISOString(),
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: {
            data: {
              externalId: scheduledItem.externalId,
              scheduledDate: '2050-05-05',
            },
          },
        });

      // The shape of the Prisma objects the above helpers return doesn't quite match
      // the type we return in GraphQL (for example, IDs stay internal, we attach an
      // ApprovedItem), so until there is a query to retrieve the scheduled item
      // of the right shape (if it's ever implemented), laborious property-by-property
      // comparison is the go.
      const returnedItem = result.body.data?.rescheduleScheduledCorpusItem;
      expect(returnedItem.externalId).to.equal(scheduledItem.externalId);
      expect(returnedItem.createdBy).to.equal(scheduledItem.createdBy);
      expect(returnedItem.updatedBy).to.equal(headers.username);

      expect(returnedItem.createdAt).to.equal(
        getUnixTimestamp(scheduledItem.createdAt)
      );

      expect(returnedItem.updatedAt).to.equal(
        getUnixTimestamp(scheduledItem.updatedAt)
      );

      expect(returnedItem.scheduledDate).to.equal('2050-05-05');

      // Finally, let's compare the returned ApprovedItem object to our inputs.
      // Need to destructure timestamps and compare them separately
      // as Prisma will convert to ISO string for comparison
      // and GraphQL server returns Unix timestamps.
      const {
        createdAt,
        updatedAt,
        authors: approvedItemAuthors,
        ...otherApprovedItemProps
      } = approvedItem;
      const {
        createdAt: createdAtReturned,
        updatedAt: updatedAtReturned,
        authors: authorsReturned,
        ...otherReturnedApprovedItemProps
      } = returnedItem.approvedItem;
      expect(getUnixTimestamp(createdAt)).to.equal(createdAtReturned);
      expect(getUnixTimestamp(updatedAt)).to.equal(updatedAtReturned);
      expect(otherApprovedItemProps).to.deep.include(
        otherReturnedApprovedItemProps
      );

      // check authors
      // note that approvedItemAuthors does not go through our graphql interface,
      // so it has *all* db properties, including externalId and approvedItemId.
      // these properties are *not* present in authorsReturned, so we need to do
      // a custom comparison
      if (approvedItemAuthors) {
        const approvedItemAuthorsMapped = approvedItemAuthors.map((aia) => {
          return {
            name: aia.name,
            sortOrder: aia.sortOrder,
          };
        });

        expect(approvedItemAuthorsMapped).to.deep.equal(authorsReturned);
      }

      // Check that the RESCHEDULE event was fired successfully:
      // 1 - Event was fired once!
      expect(eventTracker.callCount).to.equal(1);
      // 2 - Event has the right type.
      expect(await eventTracker.getCall(0).args[0].eventType).to.equal(
        ScheduledCorpusItemEventType.RESCHEDULE
      );
      // 3- Event has the right entity passed to it.
      expect(
        await eventTracker.getCall(0).args[0].scheduledCorpusItem.externalId
      ).to.equal(scheduledItem.externalId);
    });

    it('should fail if story is already scheduled for given Scheduled Surface/date combination', async () => {
      // Set up event tracking
      const eventTracker = sinon.fake();
      eventEmitter.on(ScheduledCorpusItemEventType.RESCHEDULE, eventTracker);

      // create a sample curated item
      const item = await createApprovedItemHelper(db, {
        title: 'A test story',
      });

      // create two scheduled entries for this item
      const existingScheduledEntry1 = await createScheduledItemHelper(db, {
        approvedItem: item,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: new Date(2050, 4, 4).toISOString(),
      });

      const existingScheduledEntry2 = await createScheduledItemHelper(db, {
        approvedItem: item,
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: new Date(2050, 4, 5).toISOString(),
      });

      // And this human-readable (and cross-locale understandable) format
      // is used in the error message we're anticipating to get.
      const displayDate = DateTime.fromJSDate(
        existingScheduledEntry1.scheduledDate
      ).toFormat('MMM d, y');

      // try to reschedule the second entry for the same date as the first
      const input: RescheduleScheduledItemInput = {
        externalId: existingScheduledEntry2.externalId,
        scheduledDate: '2050-05-04',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: { data: input },
        });

      expect(result.body.data).to.be.null;

      // Expecting to see a custom error message from the resolver
      expect(result.body.errors?.[0].message).to.contain(
        `This story is already scheduled to appear on ${displayDate}.`
      );

      expect(result.body.errors?.[0].extensions?.code).to.equal(
        'BAD_USER_INPUT'
      );

      // Check that the ADD_SCHEDULE event was not fired
      expect(eventTracker.callCount).to.equal(0);
    });

    it('should fail if user has read-only access', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date(2050, 4, 4).toISOString(),
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: {
            data: {
              externalId: scheduledItem.externalId,
              scheduledDate: '2050-05-05',
            },
          },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it("should fail if user doesn't have access to specified scheduled surface", async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date(2050, 4, 4).toISOString(),
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: {
            data: {
              externalId: scheduledItem.externalId,
              scheduledDate: '2050-05-05',
            },
          },
        });

      // ...without success. There is no data
      expect(result.body.data).to.be.null;

      expect(result.body.errors).to.not.be.undefined;

      // And there is an access denied error
      expect(result.body.errors?.[0].message).to.contain(ACCESS_DENIED_ERROR);
    });

    it('should succeed if user has access to specified scheduled surface', async () => {
      const headers = {
        name: 'Test User',
        username: 'test.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
      };

      const approvedItem = await createApprovedItemHelper(db, {
        title: 'This is a test',
      });

      const scheduledItem = await createScheduledItemHelper(db, {
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        approvedItem,
        scheduledDate: new Date(2050, 4, 4).toISOString(),
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(RESCHEDULE_SCHEDULED_ITEM),
          variables: {
            data: {
              externalId: scheduledItem.externalId,
              scheduledDate: '2050-05-05',
            },
          },
        });

      // Hooray! There is data
      expect(result.body.data).to.not.be.null;

      // And no errors, too!
      expect(result.body.errors).to.be.undefined;
    });
  });
});
