import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section } from '.prisma/client';

import { ScheduledItemSource, CreateSectionItemApiInput } from 'content-common';

import { client } from '../../../../database/client';
import { ApprovedItem } from '../../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createApprovedItemHelper,
} from '../../../../test/helpers';
import { CREATE_SECTION_ITEM } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: SectionItem (createSectionItem)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: CreateSectionItemApiInput;
  let server: ApolloServer<IAdminContext>;
  let section: Section;
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
    // we need a Section and an ApprovedItem to create a SectionItem
    section = await createSectionHelper(db, {
      createSource: ScheduledItemSource.ML,
    });

    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });
  });

  it('should create a SectionItem if user has full access', async () => {
    input = {
      sectionExternalId: section.externalId,
      approvedItemExternalId: approvedItem.externalId,
      rank: 1,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // the rank should be as set above
    expect(result.body.data?.createSectionItem.rank).toEqual(1);
    // the associated approvedItem should be there...
    expect(result.body.data?.createSectionItem.approvedItem).not.toBeNull();
    // ...and should match the approvedItem from the input
    expect(result.body.data?.createSectionItem.approvedItem.externalId).toEqual(
      input.approvedItemExternalId,
    );
  });

  it('should create a SectionItem without optional properties', async () => {
    // `rank` is the only optional property - omitting below
    input = {
      sectionExternalId: section.externalId,
      approvedItemExternalId: approvedItem.externalId,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // the rank should be null
    expect(result.body.data?.createSectionItem.rank).toBeNull();
    // the associated approvedItem should be there...
    expect(result.body.data?.createSectionItem.approvedItem).not.toBeNull();
    // ...and should match the approvedItem from the input
    expect(result.body.data?.createSectionItem.approvedItem.externalId).toEqual(
      input.approvedItemExternalId,
    );
  });

  it('should create a duplicate SectionItem', async () => {
    // this test explicitly demonstrates that we do not have any restrictions
    // on creating a duplicate SectionItem on the same Section.
    // this is because for initial implementation, only ML-generated Sections
    // and SectionItems will be created. in this flow, whenever ML creates a
    // new set of SectionItems for a Section, we will first deactivate any
    // existing SectionItems.

    // we'll use this input for creating two idential SectionItems
    input = {
      sectionExternalId: section.externalId,
      approvedItemExternalId: approvedItem.externalId,
      rank: 1,
    };

    // create the first SectionItem
    const result1 = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    // should not have any errors
    expect(result1.body.errors).toBeUndefined();
    expect(result1.body.data).not.toBeNull();
    expect(result1.body.data?.createSectionItem).not.toBeNull();

    const si1 = result1.body.data?.createSectionItem;

    // create the second SectionItem
    const result2 = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    // should not have any errors
    expect(result2.body.errors).toBeUndefined();
    expect(result2.body.data).not.toBeNull();
    expect(result2.body.data?.createSectionItem).not.toBeNull();

    const si2 = result2.body.data?.createSectionItem;

    // the two SectionItems should have different externalIds
    expect(si1.externalId).not.toEqual(si2.externalId);
  });

  it('should fail to create a SectionItem if the Section externalId is invalid', async () => {
    input = {
      sectionExternalId: 'aTotallyLegitimateId',
      approvedItemExternalId: approvedItem.externalId,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    // we should have a NOT_FOUND error
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // error message should reference the invalid Section externalId
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a section item: Section with id "aTotallyLegitimateId" does not exist.`,
    );
  });

  it('should fail to create a SectionItem if the ApprovedItem externalId is invalid', async () => {
    input = {
      sectionExternalId: section.externalId,
      approvedItemExternalId: 'aTotallyLegitimateId',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SECTION_ITEM),
        variables: { data: input },
      });

    // we should have a NOT_FOUND error
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // error message should reference the invalid Section externalId
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a section item: ApprovedItem with id "aTotallyLegitimateId" does not exist.`,
    );
  });
});
