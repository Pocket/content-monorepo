import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section } from '.prisma/client';

import {
  ActivitySource,
  MozillaAccessGroup,
} from 'content-common';

import { client } from '../../../../database/client';
import { ApprovedItem } from '../../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createApprovedItemHelper,
  createSectionItemHelper,
} from '../../../../test/helpers';
import { CREATE_SECTION_ITEM, UPDATE_SECTION_ITEM } from '../sample-mutations.gql';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { SectionItemEventType } from '../../../../events/types';

describe('mutations: SectionItem (updateSectionItem)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let section: Section;
  let approvedItem: ApprovedItem;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeAll(async () => {
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
  });

  afterAll(async () => {
    await server.stop();
    await clearDb(db);
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);

    section = await createSectionHelper(db, {
      createSource: ActivitySource.ML,
    });

    approvedItem = await createApprovedItemHelper(db, {
      title: 'An Article About Testing',
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should update the rank of a SectionItem', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(SectionItemEventType.UPDATE_SECTION_ITEM, eventTracker);

    // First create a SectionItem with rank 1
    const createResult = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: {
          data: {
            sectionExternalId: section.externalId,
            approvedItemExternalId: approvedItem.externalId,
            rank: 1,
          },
        },
      });

    const sectionItemExternalId =
      createResult.body.data?.createSectionItem.externalId;

    // Now update the rank to 5
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_SECTION_ITEM),
        variables: {
          data: {
            externalId: sectionItemExternalId,
            rank: 5,
          },
        },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();
    expect(result.body.data?.updateSectionItem.rank).toEqual(5);
    expect(result.body.data?.updateSectionItem.externalId).toEqual(
      sectionItemExternalId,
    );
    // the associated approvedItem should still be there
    expect(
      result.body.data?.updateSectionItem.approvedItem.externalId,
    ).toEqual(approvedItem.externalId);

    // Check that the UPDATE_SECTION_ITEM event was fired
    expect(eventTracker).toHaveBeenCalledTimes(1);
    const eventData = await eventTracker.mock.calls[0][0];
    expect(eventData.eventType).toEqual(
      SectionItemEventType.UPDATE_SECTION_ITEM,
    );
    expect(eventData.sectionItem.externalId).toEqual(sectionItemExternalId);

    // Clean up event listener
    eventEmitter.removeAllListeners(SectionItemEventType.UPDATE_SECTION_ITEM);
  });

  it('should fail if the SectionItem does not exist', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_SECTION_ITEM),
        variables: {
          data: {
            externalId: 'nonexistent-uuid',
            rank: 5,
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');
    expect(result.body.errors?.[0].message).toContain(
      'Cannot update a section item: Section item with id "nonexistent-uuid" does not exist.',
    );
  });

  it('should fail if no mutable fields are provided', async () => {
    // Create a SectionItem first
    const createResult = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: {
          data: {
            sectionExternalId: section.externalId,
            approvedItemExternalId: approvedItem.externalId,
            rank: 1,
          },
        },
      });

    const sectionItemExternalId =
      createResult.body.data?.createSectionItem.externalId;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_SECTION_ITEM),
        variables: {
          data: {
            externalId: sectionItemExternalId,
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].message).toContain(
      'At least one field to update must be provided.',
    );
  });

  it('should not update an inactive SectionItem', async () => {
    // Directly create an inactive SectionItem in the DB
    const sectionItem = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
      rank: 1,
      active: false,
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_SECTION_ITEM),
        variables: {
          data: {
            externalId: sectionItem.externalId,
            rank: 5,
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');
  });
});
