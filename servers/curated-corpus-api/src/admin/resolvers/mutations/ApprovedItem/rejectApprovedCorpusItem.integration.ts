import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ActionScreen, CuratedStatus } from 'content-common';

import { client } from '../../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { REJECT_APPROVED_ITEM } from '../sample-mutations.gql';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ReviewedCorpusItemEventType } from '../../../../events/types';
import { GET_REJECTED_ITEMS } from '../../queries/sample-queries.gql';
import { MozillaAccessGroup } from '../../../../shared/types';
import { RejectApprovedCorpusItemApiInput } from '../../types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem (rejectApprovedCorpusItem)', () => {
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

  it('moves a corpus item from the approved corpus to the rejection pile', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: 'MISINFORMATION,OTHER',
      actionScreen: ActionScreen.SCHEDULE,
    };

    const resultReject = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(resultReject.body.errors).toBeUndefined();
    expect(resultReject.body.data).not.toBeNull();

    // On success, mutation should return the deleted approved item.
    // Let's verify the id.
    expect(resultReject.body.data?.rejectApprovedCorpusItem.externalId).toEqual(
      item.externalId,
    );

    // The `updatedBy` field should now be the SSO username of the user
    // who updated this record
    expect(resultReject.body.data?.rejectApprovedCorpusItem.updatedBy).toEqual(
      headers.username,
    );

    // There should be a rejected item created. Since we always truncate
    // the database before every test, it is safe to assume that the
    // `getRejectedCorpusItems` query will contain the one item
    // that was created by this mutation.
    const resultGetReject = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({ query: print(GET_REJECTED_ITEMS) });
    // There should be one rejected item in there...
    expect(
      resultGetReject.body.data?.getRejectedCorpusItems.totalCount,
    ).toEqual(1);
    // ...and its URL should match that of the deleted Approved Item.
    expect(
      resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node.url,
    ).toEqual(item.url);
    // The `createdBy` field should now be the SSO username of the user
    // who updated this record
    expect(
      resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node.createdBy,
    ).toEqual(headers.username);

    // Check that the REMOVE_ITEM and REJECT_ITEM events were fired successfully.
    expect(eventTracker).toHaveBeenCalledTimes(2);

    // The REMOVE_ITEM event sends up-to-date info on the Approved Item.
    const removeItemEvent = await eventTracker.mock.calls[0][0];

    expect(removeItemEvent.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(removeItemEvent.reviewedCorpusItem.externalId).toEqual(
      resultReject.body.data?.rejectApprovedCorpusItem.externalId,
    );
    expect(removeItemEvent.reviewedCorpusItem.action_screen).toEqual(
      input.actionScreen,
    );
    expect(removeItemEvent.reviewedCorpusItem.url).toEqual(
      resultGetReject.body.data?.getRejectedCorpusItems.edges[0].node.url,
    );

    // The REJECT_ITEM event sends through the newly created Rejected Item.
    const rejectItemEvent = await eventTracker.mock.calls[1][0];

    expect(rejectItemEvent.eventType).toEqual(
      ReviewedCorpusItemEventType.REJECT_ITEM,
    );
    expect(rejectItemEvent.reviewedCorpusItem.action_screen).toEqual(
      input.actionScreen,
    );
  });

  it('should fail if externalId of approved item is not valid', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: 'this-id-does-not-exist',
      reason: 'MISINFORMATION,OTHER',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.[0].message).toEqual(
      `Could not find an approved item with external id of "${input.externalId}".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // Check that the events were not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should fail if approved item has Scheduled Surface scheduled entries', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

    const item = await createApprovedItemHelper(db, {
      title: 'More Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.CORPUS,
      language: 'EN',
    });

    // Add an entry to a Scheduled Surface - approved item now can't be deleted
    // for data integrity reasons.
    await createScheduledItemHelper(db, {
      approvedItem: item,
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: 'MISINFORMATION,OTHER',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();

    expect(result.body.errors?.[0].message).toEqual(
      `Cannot remove item from approved corpus - scheduled entries exist.`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual(
      'INTERNAL_SERVER_ERROR',
    );

    // Check that the events were not fired
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });

  it('should succeed with spaces in rejection reasons', async () => {
    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: ' MISINFORMATION, OTHER ',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();
  });

  it('should fail when given an invalid rejection reason', async () => {
    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: 'BADFONT',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeNull();

    expect(result.body.errors?.[0].message).toContain(
      ` is not a valid rejection reason.`,
    );
  });

  it('should fail when given invalid rejection reasons', async () => {
    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: 'BADFONT,BORINGCOLORS',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeNull();

    expect(result.body.errors?.[0].message).toContain(
      ` is not a valid rejection reason.`,
    );
  });

  it('should fail when given valid and invalid rejection reasons', async () => {
    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    const input: RejectApprovedCorpusItemApiInput = {
      externalId: item.externalId,
      reason: 'MISINFORMATION,IDONTLIKEIT',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REJECT_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeNull();

    expect(result.body.errors?.[0].message).toContain(
      ` is not a valid rejection reason.`,
    );
  });
});
