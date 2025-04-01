import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { CuratedStatus } from 'content-common';

import { client } from '../../../../database/client';

import {
  clearDb,
  createApprovedItemHelper,
  createScheduledItemHelper,
} from '../../../../test/helpers';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ReviewedCorpusItemEventType, ScheduledCorpusItemEventType } from '../../../../events/types';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe.skip('mutations: ApprovedItem (rejectApprovedCorpusItemsForDomain)', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let db: PrismaClient;
  const rejectApprovedItemForDomainEndpoint = '/admin/reject-approved-corpus-items-for-domain';

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server } = await startServer(0));
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

  it('should reject and unschedule all approved corpus items for a domain & return totalFoundApprovedCorpusItems ' +
    '& totalRejectedApprovedCorpusItems count when testing=false', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);
    eventEmitter.on(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, eventTracker);

    const item1 = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "https://elpais.com/example-one/"
    });
    // create a scheduled entry for item1
    await createScheduledItemHelper(db, {
      approvedItem: item1
    });

    const item2 = await createApprovedItemHelper(db, {
      title: '16 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "http://www.elpais.com/example-two/"
    });
    // create a scheduled entry for item2
    await createScheduledItemHelper(db, {
      approvedItem: item2
    });

    const item3 = await createApprovedItemHelper(db, {
      title: 'Another item',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "https://other.domain.com/example-one/"
    });
    // create a scheduled entry for item3
    const scheduledItem3 = await createScheduledItemHelper(db, {
      approvedItem: item3
    });

    // expect 3 approved corpus items
    let approvedCorpusItems = await db.approvedItem.findMany();
    expect(approvedCorpusItems.length).toEqual(3);

    // // expect 3 scheduled items
    let scheduledItems = await db.scheduledItem.findMany();
    expect(scheduledItems.length).toEqual(3);

    // reject corpus items for elpais.com domain
    // there are 2 approved corpus items & 2 scheduled items
    const res = await request(app)
      .post(rejectApprovedItemForDomainEndpoint)
      .send({ domainName: 'elpais.com', testing: false })
      .set(headers);

    expect(res.status).toEqual(200);
    expect(res.body.testing).toEqual(false);
    expect(res.body.domainName).toEqual('elpais.com');
    expect(res.body.totalRejectedApprovedCorpusItems).toEqual(2);
    expect(res.body.totalFoundApprovedCorpusItems).toEqual(2);

    // There should now be only 1 approved corpous item & 1 scheduled item
    // in db for other.domain.com
    approvedCorpusItems = await db.approvedItem.findMany();
    expect(approvedCorpusItems.length).toEqual(1);
    expect(approvedCorpusItems[0].url).toEqual(item3.url)

    scheduledItems = await db.scheduledItem.findMany();
    expect(scheduledItems.length).toEqual(1);
    expect(scheduledItems[0].externalId).toEqual(scheduledItem3.externalId);

    // Check that there are 6 events sent to Snowplow
    // 2 REMOVE_SCHEDULE events (for deleting scheduled item)
    // 2 REMOVE_ITEM events (for removing corpus items from ApprovedCorpus)
    // 2 REJECT_ITEM events (for rejecting the 2 corpus items)
    // Check that the REMOVE_ITEM, REJECT_ITEM, REMOVE_SCHEDULE events were fired successfully.
    expect(eventTracker).toHaveBeenCalledTimes(6);
    const removeScheduledItemEvent1 = await eventTracker.mock.calls[0][0];
    const removeItemEvent1 = await eventTracker.mock.calls[1][0];
    const rejectItemEvent1 = await eventTracker.mock.calls[2][0];

    const removeScheduledItemEvent2 = await eventTracker.mock.calls[3][0];
    const removeItemEvent2 = await eventTracker.mock.calls[4][0];
    const rejectItemEvent2 = await eventTracker.mock.calls[5][0];

    expect(removeScheduledItemEvent1.eventType).toEqual(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    );
    expect(removeItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(rejectItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REJECT_ITEM,
    );

    expect(removeScheduledItemEvent2.eventType).toEqual(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    );
    expect(removeItemEvent2.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(rejectItemEvent2.eventType).toEqual(
      ReviewedCorpusItemEventType.REJECT_ITEM,
    );
  });

  it('should reject and unschedule all approved corpus items for the exact domain provided (e.g. "as.com"), without ' +
    'matching domains that contain it as a substring (e.g. "newatlas.com"), and return totalFoundApprovedCorpusItems ' +
    'and totalRejectedApprovedCorpusItems when testing=false', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);
    eventEmitter.on(ScheduledCorpusItemEventType.REMOVE_SCHEDULE, eventTracker);

    const item1 = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "https://as.com/example-one/"
    });
    // create a scheduled entry for item1
    await createScheduledItemHelper(db, {
      approvedItem: item1
    });

    const item2 = await createApprovedItemHelper(db, {
      title: '16 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "http://www.newatlas.com/example-two/"
    });
    // create a scheduled entry for item2
    const scheduledItem2 = await createScheduledItemHelper(db, {
      approvedItem: item2
    });

    const item3 = await createApprovedItemHelper(db, {
      title: 'Another item',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "https://other.domain.com/example-one/"
    });
    // create a scheduled entry for item3
    const scheduledItem3 = await createScheduledItemHelper(db, {
      approvedItem: item3
    });

    // expect 3 approved corpus items
    let approvedCorpusItems = await db.approvedItem.findMany();
    expect(approvedCorpusItems.length).toEqual(3);

    // // expect 3 scheduled items
    let scheduledItems = await db.scheduledItem.findMany();
    expect(scheduledItems.length).toEqual(3);

    // reject corpus items for as.com domain
    // there is only 1 approved corpus item and 1 scheduled item for as.com
    const res = await request(app)
      .post(rejectApprovedItemForDomainEndpoint)
      .send({ domainName: 'as.com', testing: false })
      .set(headers);

    expect(res.status).toEqual(200);
    expect(res.body.testing).toEqual(false);
    expect(res.body.domainName).toEqual('as.com');
    expect(res.body.totalRejectedApprovedCorpusItems).toEqual(1);
    expect(res.body.totalFoundApprovedCorpusItems).toEqual(1);

    // There should now be only 2 approved corpous items & 2 scheduled items
    // in db for newatlas.com & other.domain.com
    approvedCorpusItems = await db.approvedItem.findMany();
    expect(approvedCorpusItems.length).toEqual(2);
    expect(approvedCorpusItems[0].url).toEqual(item2.url)
    expect(approvedCorpusItems[1].url).toEqual(item3.url)

    scheduledItems = await db.scheduledItem.findMany();
    expect(scheduledItems.length).toEqual(2);
    expect(scheduledItems[0].externalId).toEqual(scheduledItem2.externalId);
    expect(scheduledItems[1].externalId).toEqual(scheduledItem3.externalId);

    // Check that there are 3 events sent to Snowplow
    // 1 REMOVE_SCHEDULE event (for deleting scheduled item)
    // 1 REMOVE_ITEM event (for removing corpus item from ApprovedCorpus)
    // 1 REJECT_ITEM event (for rejecting the corpus items)
    // Check that the REMOVE_ITEM, REJECT_ITEM, REMOVE_SCHEDULE events were fired successfully.
    expect(eventTracker).toHaveBeenCalledTimes(3);
    const removeScheduledItemEvent1 = await eventTracker.mock.calls[0][0];
    const removeItemEvent1 = await eventTracker.mock.calls[1][0];
    const rejectItemEvent1 = await eventTracker.mock.calls[2][0];

    expect(removeScheduledItemEvent1.eventType).toEqual(
      ScheduledCorpusItemEventType.REMOVE_SCHEDULE,
    );
    expect(removeItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(rejectItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REJECT_ITEM,
    );
  });

  it('should return totalFoundApprovedCorpusItems count but not unschedule or reject items when testing=true', async () => {
    // create approved corpus item
    const item = await createApprovedItemHelper(db, {
      title: '15 Unheard Ways To Achieve Greater Terraform',
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
      url: "https://elpais.com/example-one/"
    });

    // create a scheduled entry
    await createScheduledItemHelper(db, {
      approvedItem: item
    });

    const res = await request(app)
      .post(rejectApprovedItemForDomainEndpoint)
      .send({ domainName: 'elpais.com', testing: true })
      .set(headers);

    expect(res.status).toEqual(200);
    expect(res.body.testing).toEqual(true);
    expect(res.body.domainName).toEqual('elpais.com');
    expect(res.body.totalFoundApprovedCorpusItems).toEqual(1);
    // items should not be reject/unscheduled
    expect(res.body.totalRejectedApprovedCorpusItems).toBeUndefined();

    // The approved item should still exist in db
    const approvedCorpusItems = await db.approvedItem.findMany();
    expect(approvedCorpusItems.length).toEqual(1);

    // The scheduled item should still exist in db
    const scheduledItems = await db.scheduledItem.findMany();
    expect(scheduledItems.length).toEqual(1);
  });

  it('should return 0 when no approved corpus items found for the domain', async () => {
    const res = await request(app)
      .post(rejectApprovedItemForDomainEndpoint)
      .send({ domainName: 'nonexistent.com', testing: false })
      .set(headers);

    expect(res.status).toEqual(200);
    expect(res.body.totalFoundApprovedCorpusItems).toEqual(0);
    expect(res.body.totalRejectedApprovedCorpusItems).toEqual(0);
  });
});
