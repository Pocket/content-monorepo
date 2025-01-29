import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import { ActivitySource } from 'content-common';

import { client } from '../../../../database/client';
import { ApprovedItem } from '../../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createSectionItemHelper,
  createApprovedItemHelper,
} from '../../../../test/helpers';
import { REMOVE_SECTION_ITEM } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: SectionItem (removeSectionItem)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let section: Section;
  let sectionItem: SectionItem;
  let approvedItem: ApprovedItem;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
  });

  afterAll(async () => {
    await server.stop();
    await clearDb(db);
    await db.$disconnect();
  });

  beforeEach(async () => {
    // we need a Section and an ApprovedItem to create & remove a SectionItem
    section = await createSectionHelper(db, {
      createSource: ActivitySource.ML,
    });

    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
      rank: 1,
      active: true
    });
  });

  it('should remove a SectionItem if user has full access', async () => {
    const rightNow = new Date();

    // control the result of `new Date()` so we can explicitly check values
    // downstream of the graph request
    jest.useFakeTimers({
      now: rightNow,
      advanceTimers: false,
      // something in the graph request needs `nextTick` to explicitly not be faked
      doNotFake: ['nextTick'],
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REMOVE_SECTION_ITEM),
        variables: { externalId: sectionItem.externalId },
      });

    // stop controlling the result of `new Date()`
    jest.useRealTimers();

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    expect(result.body.data?.removeSectionItem.externalId).toEqual(sectionItem.externalId);
    // SectionItem should be in-active
    expect(result.body.data?.removeSectionItem.active).toBeFalsy();
    // the associated approvedItem should be there...
    expect(result.body.data?.removeSectionItem.approvedItem).not.toBeNull();
    // ...and should match the approvedItem from the input
    expect(result.body.data?.removeSectionItem.approvedItem.externalId).toEqual(
      approvedItem.externalId,
    );

    // deactivatedAt & deactivateSource should be set
    const inactiveSectionItem = await db.sectionItem.findUnique({
      where: {externalId: sectionItem.externalId}
    });
    expect(inactiveSectionItem.deactivateSource).toEqual(ActivitySource.MANUAL);
    expect(inactiveSectionItem.deactivatedAt).toEqual(rightNow);
  });

  it('should fail to remove a SectionItem if SectionItem is not found', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(REMOVE_SECTION_ITEM),
        variables: { externalId: 'fake-external-id' },
      });

    // we should have a NOT_FOUND error
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // error message should reference the invalid SectionItem externalId
    expect(result.body.errors?.[0].message).toContain(
      `Error - Not Found: Cannot remove a section item: Section item with id "fake-external-id" does not exist.`,
    );
  });
});
