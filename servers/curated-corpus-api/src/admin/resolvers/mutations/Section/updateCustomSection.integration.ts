import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActivitySource,
  ScheduledSurfacesEnum,
} from 'content-common';

import { client } from '../../../../database/client';

import {
  clearDb,
  createSectionHelper,
} from '../../../../test/helpers';

import { UPDATE_CUSTOM_SECTION } from '../sample-mutations.gql';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: Section (updateCustomSection)', () => {
  let app: any;
  let adminServer: ApolloServer<IAdminContext>;
  let prisma: PrismaClient;

  const SURFACE = ScheduledSurfacesEnum.SANDBOX;
  const SECTION_EXTERNAL_ID = 'SECTION-CUSTOM-1';
  const SECTION_EXTERNAL_ID_2 = 'SECTION-CUSTOM-2'; // present but not used for slug anymore

  beforeAll(async () => {
    prisma = client(); // factory → call it
    await clearDb(prisma);

    // boot the app the same way as sibling tests
    const started = await startServer(0);
    app = started.app;
    adminServer = started.adminServer;

    // seed baseline sections using the helper (no slug/sort here)
    await createSectionHelper(prisma, {
      externalId: SECTION_EXTERNAL_ID,
      title: 'Original Title',
      scheduledSurfaceGuid: SURFACE,
      iab: null,
      createSource: ActivitySource.ML,
      active: true,
      disabled: false,
    });

    await createSectionHelper(prisma, {
      externalId: SECTION_EXTERNAL_ID_2,
      title: 'Other Section',
      scheduledSurfaceGuid: SURFACE,
      iab: null,
      createSource: ActivitySource.ML,
      active: true,
      disabled: false,
    });
  });

  afterAll(async () => {
    await adminServer?.stop();
    await prisma?.$disconnect();
  });

  it('updates a custom section (happy path)', async () => {
    const variables = {
      data: {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Editors’ Picks',
        dek: 'Fresh reads, hand-picked',
        description: 'A rotating set of editorial selections',
        imageUrl: 'https://cdn.example/picks.jpg',
        isPublished: true,
        // If your DB layer maps sortOrder -> sort, this will still be persisted
        sortOrder: 42,
      },
    };

    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const section = res.body.data?.updateCustomSection;
    expect(section).toBeTruthy();
    expect(section.externalId).toEqual(SECTION_EXTERNAL_ID);
    expect(section.title).toEqual('Editors’ Picks');
    expect(section.dek).toEqual('Fresh reads, hand-picked');
    expect(section.description).toEqual('A rotating set of editorial selections');
    expect(section.imageUrl).toEqual('https://cdn.example/picks.jpg');
    expect(section.isPublished).toBe(true);

    // sectionItems is included by your DB mutation include; may be empty and that's OK
    expect(Array.isArray(section.sectionItems)).toBe(true);
  });

  it('returns NotFoundError when section does not exist', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: { externalId: 'DOES-NOT-EXIST', title: 'Nope' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/does not exist/i);
  });

  it('returns BAD_USER_INPUT when no updatable fields provided', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: { data: { externalId: SECTION_EXTERNAL_ID } },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/No updatable fields provided/i);
  });
});