import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient, Section, SectionItem } from '.prisma/client';

import {
  ActivitySource,
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

import { DELETE_CUSTOM_SECTION } from '../sample-mutations.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';

describe('mutations: Section (deleteCustomSection)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let activeEnabledSection: Section;
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

  afterEach(async () => {
    await clearDb(db);
  });

  beforeEach(async () => {
    // Approved item to create SectionItems
    approvedItem = await createApprovedItemHelper(db, {
      title: '10 Reasons You Should Quit Social Media',
    });

    // Create an active & enabled Section
    activeEnabledSection = await createSectionHelper(db, {
      externalId: 'active-123',
      createSource: ActivitySource.MANUAL,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });

    sectionItem1 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeEnabledSection.id,
      rank: 1,
    });

    sectionItem2 = await createSectionItemHelper(db, {
      approvedItemId: approvedItem.id,
      sectionId: activeEnabledSection.id,
      rank: 1,
    });
  });

  it('should soft-delete a Custom Section successfully', async () => {

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_CUSTOM_SECTION),
        variables: { externalId: 'active-123' },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect Section to be in-active (active==false)
    expect(result.body.data?.deleteCustomSection.externalId).toEqual(
      activeEnabledSection.externalId,
    );
    expect(result.body.data?.deleteCustomSection.active).toBeFalsy();

    // Check that the sectionItems are marked as in-active
    let inactiveSectionItem1 = await db.sectionItem.findUnique({
      where: { externalId: sectionItem1.externalId },
    });
    expect(inactiveSectionItem1.externalId).toEqual(sectionItem1.externalId);
    expect(inactiveSectionItem1.active).toBeFalsy();

    let inactiveSectionItem2 = await db.sectionItem.findUnique({
      where: { externalId: sectionItem2.externalId },
    });
    expect(inactiveSectionItem2.externalId).toEqual(sectionItem2.externalId);
    expect(inactiveSectionItem2.active).toBeFalsy();
  });

  it('should fail to delete a Custom Section if the Section does not exist', async () => {
    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_CUSTOM_SECTION),
        variables: { externalId: 'non-existent-section' },
      });

    // we should have a NotFoundError
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('NOT_FOUND');

    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      `Cannot delete the section: Section with id "non-existent-section" does not exist.`,
    );
  });

  it('should fail to delete a Custom Section if createSource is not MANUAL', async () => {
    // Create an active & enabled Section
    const activeSection = await createSectionHelper(db, {
      externalId: 'section-123',
      createSource: ActivitySource.ML,
      scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
      active: true
    });

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(DELETE_CUSTOM_SECTION),
        variables: { externalId: activeSection.externalId },
      });

    // we should have a BAS_USER_INPUT
    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');

    // check the error message
    expect(result.body.errors?.[0].message).toContain(
      'Cannot delete Section: createSource must be MANUAL',
    );
  });

  it('should fail to delete a Custom Section if curator does not have access to scheduled surface', async () => {

    // Headers for a user with only SANDBOX surface access
    const sandboxHeader = {
      name: 'SandboxUser',
      username: 'sandboxuser@test.com',
      groups: `group1,group2,${MozillaAccessGroup.CURATOR_SANDBOX}`,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(sandboxHeader)
      .send({
        query: print(DELETE_CUSTOM_SECTION),
        variables: { externalId: 'active-123' },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeNull();

    expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
  });
});
