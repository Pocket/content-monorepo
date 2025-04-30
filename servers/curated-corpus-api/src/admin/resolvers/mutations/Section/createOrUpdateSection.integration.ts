import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import {
  ActivitySource,
  CreateOrUpdateSectionApiInput,
  IABMetadata,
  ScheduledSurfacesEnum,
} from 'content-common';

import { client } from '../../../../database/client';
import { ApprovedItem } from '../../../../database/types';

import {
  clearDb,
  createSectionHelper,
  createSectionItemHelper,
  createApprovedItemHelper,
} from '../../../../test/helpers';

import { CREATE_OR_UPDATE_SECTION } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: Section (createOrUpdateSection)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: CreateOrUpdateSectionApiInput;
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
    // we need an ApprovedItem to create a SectionItem
    section = await createSectionHelper(db, {
      externalId: 'bcg-456',
      createSource: ActivitySource.ML,
    });

    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    sectionItem = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: section.id,
      rank: 1,
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should create a Section if user has full access', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488"]
    }
    input = {
      externalId: '123-abc',
      title: 'Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      sort: 1,
      createSource: ActivitySource.ML,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect all fields to be set correctly
    expect(result.body.data?.createOrUpdateSection.externalId).toEqual(
      '123-abc',
    );
    expect(result.body.data?.createOrUpdateSection.title).toEqual(
      'Fake Section Title',
    );
    expect(
      result.body.data?.createOrUpdateSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(result.body.data?.createOrUpdateSection.iab).toEqual(iabMetadata);
    expect(result.body.data?.createOrUpdateSection.sort).toEqual(1);
    expect(result.body.data?.createOrUpdateSection.createSource).toEqual('ML');
    expect(result.body.data?.createOrUpdateSection.active).toBeTruthy();
  });

  it('should create a Section without optional properties', async () => {
    // `sort` is the only optional property - omitting below
    input = {
      externalId: '321-xyz',
      title: 'Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      createSource: ActivitySource.ML,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // sort should be null
    expect(result.body.data?.createOrUpdateSection.sort).toBeNull();

    // Expect all other fields to be set correctly
    expect(result.body.data?.createOrUpdateSection.externalId).toEqual(
      '321-xyz',
    );
    expect(result.body.data?.createOrUpdateSection.title).toEqual(
      'Fake Section Title',
    );
    expect(
      result.body.data?.createOrUpdateSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(result.body.data?.createOrUpdateSection.createSource).toEqual('ML');
    expect(result.body.data?.createOrUpdateSection.active).toBeTruthy();
  });

  it('should update an existing Section & mark any associated active SectionItems in-active', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488"]
    };

    input = {
      externalId: 'bcg-456',
      title: 'Updating Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      createSource: ActivitySource.ML,
      sort: 2,
      active: true,
    };

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
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    // stop controlling the result of `new Date()`
    jest.useRealTimers();

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect all fields to be set correctly
    expect(result.body.data?.createOrUpdateSection.externalId).toEqual(
      'bcg-456',
    );
    expect(result.body.data?.createOrUpdateSection.title).toEqual(
      'Updating Fake Section Title',
    );
    expect(
      result.body.data?.createOrUpdateSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(result.body.data?.createOrUpdateSection.iab).toEqual(
      iabMetadata,
    );
    expect(result.body.data?.createOrUpdateSection.sort).toEqual(2);
    expect(result.body.data?.createOrUpdateSection.createSource).toEqual('ML');
    expect(result.body.data?.createOrUpdateSection.active).toBeTruthy();

    const updatedSection = await db.section.findUnique({
      where: { externalId: 'bcg-456' },
    });
    // Expect deactivateSource to be null
    expect(updatedSection.deactivateSource).toBeNull();

    const inactiveSectionItem = await db.sectionItem.findUnique({
      where: { externalId: sectionItem.externalId },
    });

    // Expect associated section item to be in-active now
    expect(inactiveSectionItem.active).toBeFalsy();
    expect(inactiveSectionItem.deactivateSource).toEqual(ActivitySource.ML);
    expect(inactiveSectionItem.deactivatedAt).toEqual(rightNow);
  });

  it('should update an existing Section, set deactivateSource to ML if active is false & not update any associated in-active SectionItems.', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488"]
    };

    input = {
      externalId: 'bcg-456',
      title: 'Updating Fake Section Title Again',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      createSource: ActivitySource.ML,
      sort: 2,
      active: false,
    };

    // track the original date when the SectionItem was deactivated
    const originalDeactivatedAt = new Date(2020, 0, 1, 10, 0, 0, 0);

    let inactiveSectionItem = await db.sectionItem.update({
      where: { externalId: sectionItem.externalId },
      data: {
        active: false,
        deactivatedAt: originalDeactivatedAt,
      },
    });

    // Save the SectionItem original updatedAt before attempting to update the Section
    const originalSectionItemupdatedAt1 = inactiveSectionItem.updatedAt;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect all fields to be set correctly
    expect(result.body.data?.createOrUpdateSection.externalId).toEqual(
      'bcg-456',
    );
    expect(result.body.data?.createOrUpdateSection.title).toEqual(
      'Updating Fake Section Title Again',
    );
    expect(
      result.body.data?.createOrUpdateSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(
      result.body.data?.createOrUpdateSection.iab,
    ).toEqual(iabMetadata);
    expect(result.body.data?.createOrUpdateSection.sort).toEqual(2);
    expect(result.body.data?.createOrUpdateSection.createSource).toEqual('ML');
    expect(result.body.data?.createOrUpdateSection.active).toBeFalsy();

    const updatedSection = await db.section.findUnique({
      where: { externalId: 'bcg-456' },
    });
    // Expect deactivateSource to be ML
    expect(updatedSection.deactivateSource).toEqual(ActivitySource.ML);

    inactiveSectionItem = await db.sectionItem.findUnique({
      where: { externalId: sectionItem.externalId },
    });

    // Expect the associated in-active SectionItem to not be updated (it is already in-active)
    expect(inactiveSectionItem.updatedAt).toEqual(
      originalSectionItemupdatedAt1,
    );
    expect(inactiveSectionItem.active).toBeFalsy();
    expect(inactiveSectionItem.deactivatedAt).toEqual(originalDeactivatedAt);
  });

  it('should fail to create a Section if createSource is not ML', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488"]
    };

    input = {
      externalId: 'bcg-456',
      title: 'Updating Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      createSource: ActivitySource.MANUAL,
      sort: 2,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    // we should have a UserInputError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      'Cannot create or update a Section: createSource must be ML',
    );
  });

  it('should fail to create a Section if IAB taxonomy is not supported', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-Unsupported-Taxonomy", // unsupported taxonomy
      categories: ["488"] // valid code
    };

    input = {
      externalId: 'bcg-456',
      title: 'Updating Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      createSource: ActivitySource.ML,
      sort: 2,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    // we should have a UserInputError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      `IAB taxonomy version ${iabMetadata.taxonomy} is not supported`,
    );
  });

  it('should fail to create a Section if an IAB code is invalid', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488", "bad-code"]
    };

    input = {
      externalId: 'bcg-456',
      title: 'Updating Fake Section Title',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      createSource: ActivitySource.ML,
      sort: 2,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_OR_UPDATE_SECTION),
        variables: { data: input },
      });

    // we should have a UserInputError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      `IAB code(s) invalid: ${iabMetadata.categories[1]}`,
    );
  });
});
