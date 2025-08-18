import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActivitySource,
  CreateCustomSectionApiInput,
  IABMetadata,
  ScheduledSurfacesEnum,
} from 'content-common';

import { client } from '../../../../database/client';

import { clearDb } from '../../../../test/helpers';

import { CREATE_CUSTOM_SECTION } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: Section (createCustomSection)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: CreateCustomSectionApiInput;
  let server: ApolloServer<IAdminContext>;

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

  afterEach(async () => {
    await clearDb(db);
  });

  it('should create a Custom Section if user has full access', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-3.0",
      categories: ["488"]
    }
    input = {
      title: 'Fake Custom Section Title',
      description: 'fake custom section description',
      heroTitle: 'fake hero title',
      heroDescription: 'fake hero description',
      startDate: '2025-01-01',
      endDate: '2025-01-15',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      sort: 1,
      createSource: ActivitySource.MANUAL,
      disabled: false,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_CUSTOM_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect all fields to be set correctly
    expect(result.body.data?.createCustomSection.title).toEqual(
      'Fake Custom Section Title',
    );
    expect(result.body.data?.createCustomSection.description).toEqual(
      'fake custom section description',
    );
    expect(result.body.data?.createCustomSection.heroTitle).toEqual(
      'fake hero title',
    );
    expect(result.body.data?.createCustomSection.heroDescription).toEqual(
      'fake hero description',
    );
    expect(result.body.data?.createCustomSection.startDate).toEqual(
      '2025-01-01',
    );
    expect(result.body.data?.createCustomSection.endDate).toEqual(
      '2025-01-15',
    );
    expect(
      result.body.data?.createCustomSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(result.body.data?.createCustomSection.iab).toEqual(iabMetadata);
    expect(result.body.data?.createCustomSection.sort).toEqual(1);
    expect(result.body.data?.createCustomSection.createSource).toEqual('MANUAL');
    expect(result.body.data?.createCustomSection.active).toBeTruthy();
    expect(result.body.data?.createCustomSection.disabled).toBeFalsy();
  });

  it('should create a Custom Section without optional properties', async () => {
    input = {
      title: 'Fake Custom Section Title',
      description: 'fake custom section description',
      startDate: '2025-01-01',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      createSource: ActivitySource.MANUAL,
      disabled: false,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_CUSTOM_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // sort should be null
    expect(result.body.data?.createCustomSection.sort).toBeNull();

    // Expect all other fields to be set correctly
    expect(result.body.data?.createCustomSection.title).toEqual(
      'Fake Custom Section Title',
    );
    expect(result.body.data?.createCustomSection.description).toEqual(
      'fake custom section description',
    );
    expect(result.body.data?.createCustomSection.startDate).toEqual(
      '2025-01-01',
    );
    expect(
      result.body.data?.createCustomSection.scheduledSurfaceGuid,
    ).toEqual('NEW_TAB_EN_US');
    expect(result.body.data?.createCustomSection.createSource).toEqual('MANUAL');
    expect(result.body.data?.createCustomSection.active).toBeTruthy();
    expect(result.body.data?.createCustomSection.disabled).toBeFalsy();
  });

  it('should fail to create a Section if createSource is not MANUAL', async () => {
    input = {
      title: 'Fake Custom Section Title',
      description: 'fake custom section description',
      startDate: '2025-01-01',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      sort: 1,
      createSource: ActivitySource.ML,
      disabled: false,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_CUSTOM_SECTION),
        variables: { data: input },
      });

    // we should have a UserInputError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      'Cannot create a custom Section: createSource must be MANUAL',
    );
  });

  it('should fail to create a Section if IAB taxonomy is not supported', async () => {
    const iabMetadata: IABMetadata = {
      taxonomy: "IAB-Unsupported-Taxonomy", // unsupported taxonomy
      categories: ["488"] // valid code
    };

    input = {
      title: 'Fake Custom Section Title',
      description: 'fake custom section description',
      heroTitle: 'fake hero title',
      heroDescription: 'fake hero description',
      startDate: '2025-01-01',
      endDate: '2025-01-15',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      sort: 1,
      createSource: ActivitySource.MANUAL,
      disabled: false,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_CUSTOM_SECTION),
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
      title: 'Fake Custom Section Title',
      description: 'fake custom section description',
      heroTitle: 'fake hero title',
      heroDescription: 'fake hero description',
      startDate: '2025-01-01',
      endDate: '2025-01-15',
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      iab: iabMetadata,
      sort: 1,
      createSource: ActivitySource.MANUAL,
      disabled: false,
      active: true,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_CUSTOM_SECTION),
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
