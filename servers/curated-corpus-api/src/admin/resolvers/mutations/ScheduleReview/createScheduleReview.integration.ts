import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { DateTime } from 'luxon';
import { MozillaAccessGroup } from 'content-common';

import { client } from '../../../../database/client';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import { clearDb, createScheduleReviewHelper } from '../../../../test/helpers';
import { CREATE_SCHEDULE_REVIEW } from '../sample-mutations.gql';
import { CreateScheduleReviewInput } from '../../types';
import { ACCESS_DENIED_ERROR } from '../../../../shared/types';

describe('mutations: ScheduleReview (createScheduleReview)', () => {
  let app: Express.Application;
  let server: ApolloServer<IAdminContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeEach(async () => {
    await clearDb(db);
  });

  it('should fail on invalid Scheduled Surface GUID', async () => {
    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NOT_A_SURFACE',
      scheduledDate: '2025-01-01',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();
    expect(result.body.errors).not.toBeUndefined();

    // And there is the correct error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot mark a surface as reviewed with Scheduled Surface GUID of "NOT_A_SURFACE".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
  });

  it('should fail if a curator has already marked this Scheduled Surface/date combination as reviewed', async () => {
    // create a schedule review entry
    const existingReviewEntry = await createScheduleReviewHelper(db, {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2025-01-01',
    });

    // This is the date format for the GraphQL mutation.
    const scheduledDate = DateTime.fromJSDate(
      existingReviewEntry.scheduledDate,
      { zone: 'utc' },
    ).toFormat('yyyy-MM-dd');

    // And this human-readable (and cross-locale understandable) format
    // is used in the error message we're anticipating to get.
    const displayDate = DateTime.fromJSDate(existingReviewEntry.scheduledDate, {
      zone: 'utc',
    }).toFormat('MMM d, y');

    // Set up the input for the mutation that contains the exact same values
    // as the scheduled entry created above.
    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: existingReviewEntry.scheduledSurfaceGuid,
      scheduledDate,
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();
    // Expecting to see a custom error message from the resolver
    expect(result.body.errors?.[0].message).toContain(
      `The NEW_TAB_EN_US surface has already been reviewed on ${displayDate}.`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual(
      'ALREADY_REVIEWED',
    );
  });

  it('should create an entry and return data', async () => {
    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    const scheduleReview = result.body.data?.createScheduleReview;

    // Expect these fields to return valid values
    expect(scheduleReview.reviewedBy).toEqual(headers.username);
    expect(scheduleReview.reviewedAt).not.toBeNull();
    expect(scheduleReview.createdAt).not.toBeNull();
    expect(scheduleReview.updatedAt).not.toBeNull();

    // Expect these to match the input values
    expect(scheduleReview.scheduledSurfaceGuid).toStrictEqual(
      input.scheduledSurfaceGuid,
    );
    expect(new Date(scheduleReview.scheduledDate)).toStrictEqual(
      new Date(input.scheduledDate),
    );
  });

  it('should fail if user has read-only access', async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
    };

    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();

    expect(result.body.errors).not.toBeUndefined();

    // And there is an access denied error
    expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
  });

  it("should fail if user doesn't have access to specified scheduled surface", async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_DEDE}`,
    };

    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    // ...without success. There is no data
    expect(result.body.data).toBeNull();

    expect(result.body.errors).not.toBeUndefined();

    // And there is an access denied error
    expect(result.body.errors?.[0].message).toContain(ACCESS_DENIED_ERROR);
  });

  it('should succeed if user has access to specified scheduled surface', async () => {
    const headers = {
      name: 'Test User',
      username: 'test.user@test.com',
      groups: `group1,group2,${MozillaAccessGroup.NEW_TAB_CURATOR_ENUS}`,
    };

    const input: CreateScheduleReviewInput = {
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
      scheduledDate: '2100-01-01',
    };

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(CREATE_SCHEDULE_REVIEW),
        variables: { data: input },
      });

    // Hooray! There is data
    expect(result.body.data).not.toBeNull();

    // And no errors, either!
    expect(result.body.errors).toBeUndefined();
  });
});
