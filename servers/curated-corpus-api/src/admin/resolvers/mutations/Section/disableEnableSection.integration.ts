import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import {
  ActivitySource,
  DisableEnableSectionApiInput,
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

import { DISABLE_ENABLE_SECTION } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: Section (disableEnableSection)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: DisableEnableSectionApiInput;
  let server: ApolloServer<IAdminContext>;
  let activeEnabledSection: Section;
  let activeDisabledSection: Section;
  let sectionItem1: SectionItem;
  let sectionItem2: SectionItem;
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
    // Approved item to create SectionItems
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    // Create an active & enabled Section
    activeEnabledSection = await createSectionHelper(db, {
      externalId: 'active-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });

    sectionItem1 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeEnabledSection.id,
      rank: 1,
    });

    // Create an active & disabled Section
    activeDisabledSection = await createSectionHelper(db, {
      externalId: 'active-disabled-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true,
      disabled: true
    });

    sectionItem2 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeDisabledSection.id,
      rank: 1,
    });
  });

  afterEach(async () => {
    await clearDb(db);
  });

  it('should disable a Section successfully', async () => {
    input = {
      externalId: 'active-123',
      disabled: true
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DISABLE_ENABLE_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect Section to be disabled (disabled == true)
    expect(result.body.data?.disableEnableSection.externalId).toEqual(
      activeEnabledSection.externalId,
    );
    expect(result.body.data?.disableEnableSection.disabled).toBeTruthy();
    // Expect the result to return the Section's SectionItem
    expect(result.body.data?.disableEnableSection.sectionItems.length).toEqual(1);
    expect(result.body.data?.disableEnableSection.sectionItems[0].externalId).toEqual(sectionItem1.externalId);
  });

  it('should enable a Section successfully', async () => {
    input = {
      externalId: 'active-disabled-123',
      disabled: false
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DISABLE_ENABLE_SECTION),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect Section to be enabled (disabled == false)
    expect(result.body.data?.disableEnableSection.externalId).toEqual(
      activeDisabledSection.externalId,
    );
    expect(result.body.data?.disableEnableSection.disabled).toBeFalsy();
    // Expect the result to return the Section's SectionItem
    expect(result.body.data?.disableEnableSection.sectionItems.length).toEqual(1);
    expect(result.body.data?.disableEnableSection.sectionItems[0].externalId).toEqual(sectionItem2.externalId);
  });

  it('should fail to enable/disable a Section if the Section does not exist', async () => {
    input = {
      externalId: 'fake-section',
      disabled: true
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DISABLE_ENABLE_SECTION),
        variables: { data: input },
      });

    // we should have a NotFoundError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      `Cannot disable or enable the section: Section with id "${input.externalId}" does not exist.`,
    );
  });
});
