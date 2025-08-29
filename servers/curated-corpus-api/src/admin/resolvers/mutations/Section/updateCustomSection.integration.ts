import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActivitySource,
  ScheduledSurfacesEnum,
  MozillaAccessGroup,
  UpdateCustomSectionApiInput,
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

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  const SURFACE = ScheduledSurfacesEnum.SANDBOX;
  const SECTION_EXTERNAL_ID = 'SECTION-CUSTOM-1';
  const SECTION_EXTERNAL_ID_ML = 'SECTION-ML-1';
  const SECTION_WITH_METADATA = 'SECTION-CUSTOM-2';

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

    // Create a section with all metadata for partial update tests
    await prisma.section.create({
      data: {
        externalId: SECTION_WITH_METADATA,
        title: 'Full Metadata Section',
        description: 'Original Description',
        heroTitle: 'Original Hero Title',
        heroDescription: 'Original Hero Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        scheduledSurfaceGuid: SURFACE,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['1'],
        },
        sort: 10,
        createSource: ActivitySource.MANUAL,
        active: true,
        disabled: false,
      },
    });
  });

  afterAll(async () => {
    await adminServer?.stop();
    await prisma?.$disconnect();
  });

  describe('successful updates', () => {
    it('updates a custom section with all fields', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Fully Updated Title',
        description: 'Fully Updated Description',
        heroTitle: 'Updated Hero Title',
        heroDescription: 'Updated Hero Description',
        startDate: '2025-02-01',
        endDate: '2025-12-31',
        updateSource: ActivitySource.MANUAL,
        sort: 42,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['1', '2'],
        },
      };
      
      const variables = { data };

      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables,
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const section = res.body.data?.updateCustomSection;
      expect(section).toBeTruthy();
      expect(section.externalId).toEqual(SECTION_EXTERNAL_ID);
      expect(section.title).toEqual('Fully Updated Title');
      expect(section.description).toEqual('Fully Updated Description');
      expect(section.heroTitle).toEqual('Updated Hero Title');
      expect(section.heroDescription).toEqual('Updated Hero Description');
      expect(section.startDate).toEqual('2025-02-01');
      expect(section.endDate).toEqual('2025-12-31');
      expect(section.createSource).toEqual('MANUAL');
      expect(section.sort).toEqual(42);
      expect(Array.isArray(section.sectionItems)).toBe(true);
    });

    it('updates with minimal fields (only required)', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Required Title',
        description: 'Required Description',
        startDate: '2025-01-15',
        updateSource: ActivitySource.MANUAL,
      };
      
      const variables = { data };

      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables,
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const section = res.body.data?.updateCustomSection;
      expect(section).toBeTruthy();
      // Should have the new required title
      expect(section.title).toEqual('Required Title');
      expect(section.description).toEqual('Required Description');
      expect(section.startDate).toEqual('2025-01-15');
    });

    it('preserves existing fields when doing partial update', async () => {
      // First, get the current state
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_WITH_METADATA,
        title: 'Partial Update Title',
        description: 'Original Description', // Required field
        startDate: '2025-01-01', // Required field
        updateSource: ActivitySource.MANUAL,
      };
      
      const initialRes = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(initialRes.status).toBe(200);
      const section = initialRes.body.data?.updateCustomSection;
      
      // Check that only title changed
      expect(section.title).toEqual('Partial Update Title');
      expect(section.description).toEqual('Original Description');
      expect(section.heroTitle).toEqual('Original Hero Title');
      expect(section.heroDescription).toEqual('Original Hero Description');
      expect(section.sort).toEqual(10);
    });

    it('can clear optional fields by setting to null', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_WITH_METADATA,
        title: 'Partial Update Title', // Required field
        description: 'Original Description', // Required field
        startDate: '2025-01-01', // Required field
        endDate: null,
        heroTitle: null,
        heroDescription: null,
        updateSource: ActivitySource.MANUAL,
      };
      
      const variables = { data };

      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables,
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const section = res.body.data?.updateCustomSection;
      expect(section.endDate).toBeNull();
      expect(section.heroTitle).toBeNull();
      expect(section.heroDescription).toBeNull();
      // Other fields should remain unchanged
      expect(section.title).toEqual('Partial Update Title');
      expect(section.description).toEqual('Original Description');
    });

  });

  describe('validation errors', () => {
    it('returns error when section does not exist', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: 'DOES-NOT-EXIST',
        title: 'Should Fail',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/Cannot update section: Section with id "DOES-NOT-EXIST" does not exist/);
    });

    it('returns error when curator does not have access to the section surface', async () => {
      // Create a section on a different surface (NEW_TAB_EN_US)
      await prisma.section.create({
        data: {
          externalId: 'SECTION-DIFFERENT-SURFACE',
          title: 'Different Surface Section',
          description: 'Section on a different surface',
          scheduledSurfaceGuid: ScheduledSurfacesEnum.NEW_TAB_EN_US,
          iab: null,
          sort: 1,
          createSource: ActivitySource.MANUAL,
          active: true,
          disabled: false,
        },
      });

      // Headers for a curator with only SANDBOX access
      const limitedHeaders = {
        name: 'Limited User',
        username: 'limited.user@test.com',
        groups: `group1,group2,${MozillaAccessGroup.CURATOR_SANDBOX}`,
      };

      const data: UpdateCustomSectionApiInput = {
        externalId: 'SECTION-DIFFERENT-SURFACE',
        title: 'Should Not Be Allowed',
        description: 'This update should fail',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
      };

      const res = await request(app)
        .post('/admin')
        .set(limitedHeaders)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/You do not have access to perform this action/i);
    });

    it('returns error when trying to update non-MANUAL section', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID_ML,
        title: 'Cannot Update ML Section',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/not a custom \(MANUAL\) Section/);
    });

    it('returns error when updateSource is not MANUAL', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Should Fail',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.ML,
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/updateSource must be MANUAL/);
    });

    it('returns error when updateSource is missing', async () => {
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: {
            data: {
              externalId: SECTION_EXTERNAL_ID,
              title: 'Should Fail',
              description: 'Description',
              startDate: '2025-01-01',
            },
          },
        });

      expect(res.status).toBe(200);
      const [err] = res.body.errors;
      expect(err.message).toMatch(/Field "updateSource" of required type/);
    });
  });

  describe('IAB validation', () => {
    it('validates IAB categories are correct', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Title',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['INVALID_CODE', 'ANOTHER_INVALID'],
        },
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/IAB code\(s\) invalid: INVALID_CODE,ANOTHER_INVALID/);
    });

    it('validates IAB taxonomy version is supported', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Title',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
        iab: {
          taxonomy: 'INVALID_TAXONOMY',
          categories: ['1'],
        },
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      const [err] = res.body.errors;
      expect(err.message).toMatch(/IAB taxonomy version INVALID_TAXONOMY is not supported/);
    });

    it('accepts valid IAB metadata', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Title',
        description: 'Description',
        startDate: '2025-01-01',
        updateSource: ActivitySource.MANUAL,
        iab: {
          taxonomy: 'IAB-3.0',
          categories: ['1', '2', '39'],
        },
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      
      const section = res.body.data?.updateCustomSection;
      expect(section.iab).toEqual({
        taxonomy: 'IAB-3.0',
        categories: ['1', '2', '39'],
      });
    });
  });

  describe('date validation', () => {
    it('accepts valid date formats', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Title',
        description: 'Description',
        startDate: '2025-03-15',
        endDate: '2025-09-30',
        updateSource: ActivitySource.MANUAL,
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      
      const section = res.body.data?.updateCustomSection;
      expect(section.startDate).toEqual('2025-03-15');
      expect(section.endDate).toEqual('2025-09-30');
    });

    it('can set endDate to null to make section permanent', async () => {
      const data: UpdateCustomSectionApiInput = {
        externalId: SECTION_EXTERNAL_ID,
        title: 'Title',
        description: 'Description',
        startDate: '2025-01-01',
        endDate: null,
        updateSource: ActivitySource.MANUAL,
      };
      
      const res = await request(app)
        .post('/admin')
        .set(headers)
        .send({
          query: print(UPDATE_CUSTOM_SECTION),
          variables: { data },
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      
      const section = res.body.data?.updateCustomSection;
      expect(section.endDate).toBeNull();
    });
  });
});