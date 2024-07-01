import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { ActionScreen, CuratedStatus, ApprovedItemGrade } from 'content-common';

import { client } from '../../../../database/client';

import { clearDb, createApprovedItemHelper } from '../../../../test/helpers';
import { UPDATE_APPROVED_ITEM_GRADE } from '../sample-mutations.gql';
import { ApprovedItem } from '../../../../database/types';
import { curatedCorpusEventEmitter as eventEmitter } from '../../../../events/init';
import { ReviewedCorpusItemEventType } from '../../../../events/types';
import { MozillaAccessGroup } from 'content-common';
import { UpdateApprovedCorpusItemGradeApiInput } from '../../types';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';

describe('mutations: ApprovedItem (updateApprovedCorpusItemGrade)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let input: UpdateApprovedCorpusItemGradeApiInput;
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
      grade: ApprovedItemGrade.B,
    });

    input = {
      externalId: item.externalId,
      grade: ApprovedItemGrade.A,
      actionScreen: ActionScreen.SCHEDULE,
    };
  });

  it('should update an approved item grade and emit an analytics event', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM_GRADE),
        variables: {
          data: input,
        },
      });

    expect(result.body.errors).toBeUndefined();
    const data = result.body.data;

    // grade should be updated
    expect(data?.updateApprovedCorpusItemGrade.grade).toEqual(input.grade);

    // time via the graph is in seconds
    expect(data?.updateApprovedCorpusItemGrade.updatedAt).toBeGreaterThan(
      item.updatedAt.getTime() / 1000, // time direct from the db is in milliseconds
    );

    // the rest of the properties should not be updated

    // pull out properties that aren't expected to match
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      id: itemId,
      authors: itemAuthors,
      grade: itemGrade,
      domainName: updatedDomainName,
      createdAt: itemCreatedAt,
      updatedAt: itemUpdatedAt,
      updatedBy: itemUpdatedBy,
      ...itemDataToCompare
    } = item;

    const {
      authors: updatedAuthors,
      grade: updatedGrade,
      hasTrustedDomain: updatedHasTrustedDomain,
      createdAt: updatedCreatedAt,
      updatedAt: updatedUpdatedAt,
      updatedBy: updatedUpdatedBy,
      ...updatedDataToCompare
    } = data.updateApprovedCorpusItemGrade;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    expect(updatedDataToCompare).toEqual(itemDataToCompare);

    // author objects vary between a db entity (which is `itemAuthors`) and a graph entity (`updatedAuthors`),
    // so just compare the important parts - name and sortOrder
    for (let i = 0; i < itemAuthors.length; i++) {
      expect(itemAuthors[i].name).toEqual(updatedAuthors[i].name);
      expect(itemAuthors[i].sortOrder).toEqual(updatedAuthors[i].sortOrder);
    }

    // Check that the UPDATE_ITEM event was fired successfully:
    // 1 - Event was fired once!
    expect(eventTracker).toHaveBeenCalledTimes(1);

    const emitUpdatedCorpusItemEventArgs = await eventTracker.mock.calls[0][0];

    // 2 - Event has the right type.
    expect(await emitUpdatedCorpusItemEventArgs.eventType).toEqual(
      ReviewedCorpusItemEventType.UPDATE_ITEM,
    );

    // 3- Event has the right entity passed to it.
    expect(
      await emitUpdatedCorpusItemEventArgs.reviewedCorpusItem.externalId,
    ).toEqual(data?.updateApprovedCorpusItemGrade.externalId);

    // 4- Event has the right action screen passed to it.
    expect(
      emitUpdatedCorpusItemEventArgs.reviewedCorpusItem.action_screen,
    ).toEqual(ActionScreen.SCHEDULE);
  });

  it('should fail when given an unknown grade value', async () => {
    // Set up event tracking
    const eventTracker = jest.fn();
    eventEmitter.on(ReviewedCorpusItemEventType.UPDATE_ITEM, eventTracker);

    const result = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(UPDATE_APPROVED_ITEM_GRADE),
        variables: {
          data: {
            externalId: item.externalId,
            grade: 'D',
            actionScreen: ActionScreen.SCHEDULE,
          },
        },
      });

    expect(result.body.errors).not.toBeUndefined();
    expect(result.body.errors[0].extensions.code).toEqual('BAD_USER_INPUT');
    expect(result.body.data).toBeUndefined();

    // Check that the UPDATE_ITEM event was not sent
    expect(eventTracker).toHaveBeenCalledTimes(0);
  });
});
