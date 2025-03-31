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
import { ReviewedCorpusItemEventType } from '../../../../events/types';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem (rejectApprovedCorpusItem)', () => {
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

  it('should reject all approved corpus items & unschedule items for a domain & return totalFoundApprovedCorpusItems & totalRejectedApprovedCorpusItems count when testing=false', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.REMOVE_ITEM, eventTracker);
    eventEmitter.on(ReviewedCorpusItemEventType.REJECT_ITEM, eventTracker);

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

    // Check that there are 4 events sent to Snowplow
    // 2 REMOVE_ITEM events (for removing scheduled item)
    // 2 REJECT_ITEM events (for rejecting the 2 corpus items)
    // Check that the REMOVE_ITEM and REJECT_ITEM events were fired successfully.
    expect(eventTracker).toHaveBeenCalledTimes(4);
    const removeItemEvent1 = await eventTracker.mock.calls[0][0];
    const rejectItemEvent1 = await eventTracker.mock.calls[1][0];
    const removeItemEvent2 = await eventTracker.mock.calls[2][0];
    const rejectItemEvent2 = await eventTracker.mock.calls[3][0];

    expect(removeItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(rejectItemEvent1.eventType).toEqual(
      ReviewedCorpusItemEventType.REJECT_ITEM,
    );

    expect(removeItemEvent2.eventType).toEqual(
      ReviewedCorpusItemEventType.REMOVE_ITEM,
    );
    expect(rejectItemEvent2.eventType).toEqual(
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
