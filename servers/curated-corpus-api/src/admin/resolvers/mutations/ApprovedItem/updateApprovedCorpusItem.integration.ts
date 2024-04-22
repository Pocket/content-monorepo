import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import {
  ActionScreen,
  ApprovedItemAuthor,
  CuratedStatus,
  CorpusLanguage,
  Topics,
} from 'content-common';

import { client } from '../../../../database/client';

import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import { UPDATE_APPROVED_ITEM } from '../sample-mutations.gql';
import { ApprovedItem } from '../../../../database/types';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ReviewedCorpusItemEventType } from '../../../../events/types';
import { MozillaAccessGroup } from '../../../../shared/types';
import { UpdateApprovedCorpusItemApiInput } from '../../types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem (updateApprovedCorpusItem)', () => {
  let app: Express.Application;
  let authors: ApprovedItemAuthor[];
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: UpdateApprovedCorpusItemApiInput;
  let item: ApprovedItem;
  let server: ApolloServer<IAdminContext>;

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

    item = await createApprovedItemHelper(db, {
      title: "3 Things Everyone Knows About LEGO That You Don't",
      status: CuratedStatus.RECOMMENDATION,
      language: 'EN',
    });

    // authors from `item` above do not go through graphql and therefore
    // contain extra info (externalId, approvedItemId). we need to remove
    // those properties to prepare an authors array for the update `input`
    // below
    if (item.authors) {
      authors =
        item.authors?.map((author) => ({
          name: author.name,
          sortOrder: author.sortOrder,
        })) ?? [];
    }

    input = {
      externalId: item.externalId,
      title: 'Anything but LEGO',
      excerpt: 'Updated excerpt',
      authors,
      status: CuratedStatus.CORPUS,
      imageUrl: 'https://test.com/image.png',
      language: CorpusLanguage.DE,
      publisher: 'Cloud Factory',
      datePublished: '2024-02-24',
      topic: Topics.BUSINESS,
      isTimeSensitive: true,
    };
  });

  it('should succeed on the happy path (full access, valid input)', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

    const res = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });

    // Good to check for any errors before proceeding with the rest of the test
    expect(res.body.errors).toBeUndefined();
    const data = res.body.data;

    // External ID should be unchanged
    expect(data?.updateApprovedCorpusItem.externalId).toEqual(item.externalId);

    // Updated properties should be... updated
    expect(data?.updateApprovedCorpusItem).toMatchObject(input);

    // The `updatedBy` field should now be the SSO username of the user
    // who updated this record
    expect(data?.updateApprovedCorpusItem.updatedBy).toEqual(headers.username);

    // Check that the UPDATE_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.UPDATE_ITEM,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(data?.updateApprovedCorpusItem.externalId);
  });

  it('should succeed if publication date is not provided', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

    // clone the input
    const inputWithoutDatePublished = { ...input };

    // delete the publication date (not all items will have this data)
    delete inputWithoutDatePublished.datePublished;

    const res = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: inputWithoutDatePublished },
      });

    // Good to check for any errors before proceeding with the rest of the test
    expect(res.body.errors).toBeUndefined();
    const data = res.body.data;

    // External ID should be unchanged
    expect(data?.updateApprovedCorpusItem.externalId).toEqual(item.externalId);

    // Updated properties should be... updated
    expect(data?.updateApprovedCorpusItem).toMatchObject(
      inputWithoutDatePublished,
    );

    // Publication date was not provided by the test helper and should
    // remain empty after this update
    expect(data?.updateApprovedCorpusItem.datePublished).toBeNull();

    // The `updatedBy` field should now be the SSO username of the user
    // who updated this record
    expect(data?.updateApprovedCorpusItem.updatedBy).toEqual(headers.username);

    // Check that the UPDATE_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);
    // 2 - Event has the right type.
    expect(await eventTracker.mock.calls[0][0].eventType).toEqual(
      ReviewedCorpusItemEventType.UPDATE_ITEM,
    );
    // 3- Event has the right entity passed to it.
    expect(
      await eventTracker.mock.calls[0][0].reviewedCorpusItem.externalId,
    ).toEqual(data?.updateApprovedCorpusItem.externalId);
  });

  it('should accept optional analytics metadata', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

    // extra inputs for analytics data
    input.actionScreen = ActionScreen.SCHEDULE;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).not.toBeNull();

    // Expect to see all the input data we supplied in the Approved Item
    // returned by the mutation

    // We only return the approved item here, so need to purge the analytics
    // input values from the input before comparison.
    delete input.actionScreen;

    expect(result.body.data?.updateApprovedCorpusItem).toMatchObject(input);

    expect(eventTracker).toHaveBeenCalledTimes(1);

    // 2 - Events have the right values.
    const emitUpdatedCorpusItemEventArgs = await eventTracker.mock.calls[0][0];

    expect(
      emitUpdatedCorpusItemEventArgs.reviewedCorpusItem.action_screen,
    ).toEqual(ActionScreen.SCHEDULE);
  });

  it('should fail if sent an invalid topic', async () => {
    // this should be `HEALTH_FITNESS`
    input.topic = 'HEALTH FITNESS';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });

    expect(result.body.data).toBeNull();
    expect(result.body.errors).not.toBeUndefined();

    // And there is the right error from the resolvers
    expect(result.body.errors?.[0].message).toContain(
      `Cannot create a corpus item with the topic "${input.topic}".`,
    );
    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
  });

  it('should fail if language code is outside of allowed values', async () => {
    // remove type safety to force a bad value
    const badInput: any = { ...input };
    badInput.language = 'ZZ';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: badInput },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeUndefined();

    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    expect(result.body.errors?.[0].message).toContain(
      'does not exist in "CorpusLanguage" enum.',
    );
  });

  it('should fail if language code is correct but not in upper case', async () => {
    const badInput: any = { ...input };
    badInput.language = 'de';

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: badInput },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.data).toBeUndefined();

    expect(result.body.errors?.[0].extensions?.code).toEqual('BAD_USER_INPUT');
    expect(result.body.errors?.[0].message).toContain(
      'does not exist in "CorpusLanguage" enum.',
    );
  });

  it('should succeed if language code (English) is correct and upper case', async () => {
    input.language = CorpusLanguage.EN;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });
    // Good to check for any errors before proceeding with the rest of the test
    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;
    expect(data.updateApprovedCorpusItem.language).toEqual('EN');
  });

  it('should succeed if language code (Deutsch) is correct and upper case', async () => {
    input.language = CorpusLanguage.DE;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });
    // Good to check for any errors before proceeding with the rest of the test
    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;
    expect(data.updateApprovedCorpusItem.language).toEqual('DE');
  });

  it('should succeed if language code (Italian) is correct and upper case', async () => {
    input.language = CorpusLanguage.IT;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });
    // Good to check for any errors before proceeding with the rest of the test
    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;
    expect(data.updateApprovedCorpusItem.language).toEqual('IT');
  });

  it('should succeed if language code (Spanish) is correct and upper case', async () => {
    input.language = CorpusLanguage.ES;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });
    // Good to check for any errors before proceeding with the rest of the test
    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;
    expect(data.updateApprovedCorpusItem.language).toEqual('ES');
  });

  it('should succeed if language code (French) is correct and upper case', async () => {
    input.language = CorpusLanguage.FR;

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM),
        variables: { data: input },
      });
    // Good to check for any errors before proceeding with the rest of the test
    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;
    expect(data.updateApprovedCorpusItem.language).toEqual('FR');
  });
});
