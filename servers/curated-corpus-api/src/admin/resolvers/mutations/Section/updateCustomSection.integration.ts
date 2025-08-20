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
  const SECTION_EXTERNAL_ID_ML = 'SECTION-ML-1';

  beforeAll(async () => {
    prisma = client();
    await clearDb(prisma);

    const started = await startServer(0);
    app = started.app;
    adminServer = started.adminServer;

    // Create a MANUAL section that can be updated
    await createSectionHelper(prisma, {
      externalId: SECTION_EXTERNAL_ID,
      title: 'Original Title',
      scheduledSurfaceGuid: SURFACE,
      iab: null,
      createSource: ActivitySource.MANUAL,
      active: true,
      disabled: false,
    });

    // Create an ML section that cannot be updated via this mutation
    await createSectionHelper(prisma, {
      externalId: SECTION_EXTERNAL_ID_ML,
      title: 'ML Section',
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
        title: 'Updated Title',
        description: 'Updated Description',
        heroTitle: 'Hero Title',
        heroDescription: 'Hero Description',
        startDate: '2025-01-20',
        endDate: '2025-12-31',
        createSource: 'MANUAL',
        active: true,
        sort: 42,
        iab: {
          taxonomy: 'IAB_3_0',
          categories: ['IAB1', 'IAB1-1'],
        },
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
    expect(section.title).toEqual('Updated Title');
    expect(section.createSource).toEqual('MANUAL');
    expect(section.active).toBe(true);
    expect(section.sort).toEqual(42);
    expect(Array.isArray(section.sectionItems)).toBe(true);
  });

  it('updates with minimal fields', async () => {
    const variables = {
      data: {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Minimal Update',
        createSource: 'MANUAL',
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
    expect(section.title).toEqual('Minimal Update');
  });

  it('returns error when section does not exist', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: {
            externalId: 'DOES-NOT-EXIST',
            title: 'Nope',
            createSource: 'MANUAL',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/Section not found/i);
  });

  it('returns error when trying to update non-MANUAL section', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: {
            externalId: SECTION_EXTERNAL_ID_ML,
            title: 'Cannot Update',
            createSource: 'MANUAL',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/not a custom \(MANUAL\) Section/i);
  });

  it('returns error when createSource is not MANUAL', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: {
            externalId: SECTION_EXTERNAL_ID,
            title: 'Updated Title',
            createSource: 'ML',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/createSource must be MANUAL/i);
  });

  it('validates IAB categories', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: {
            externalId: SECTION_EXTERNAL_ID,
            createSource: 'MANUAL',
            iab: {
              taxonomy: 'IAB_3_0',
              categories: ['INVALID_CODE'],
            },
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/IAB code\(s\) invalid/i);
  });

  it('validates IAB taxonomy version', async () => {
    const res = await request(app)
      .post('/admin')
      .send({
        query: print(UPDATE_CUSTOM_SECTION),
        variables: {
          data: {
            externalId: SECTION_EXTERNAL_ID,
            createSource: 'MANUAL',
            iab: {
              taxonomy: 'INVALID_TAXONOMY',
              categories: ['IAB1'],
            },
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    const [err] = res.body.errors;
    expect(err.message).toMatch(/IAB taxonomy version .* is not supported/i);
  });
});