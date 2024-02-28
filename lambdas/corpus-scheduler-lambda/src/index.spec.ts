import { processor } from './';
import * as Utils from './utils';
import nock from 'nock';
import config from './config';
import {Callback, Context, SQSEvent} from 'aws-lambda';
import * as CuratedCorpusApi from './createApprovedCorpusItem';
import {createScheduledCandidate, createScheduledCandidates} from './testHelpers';
import {CorpusItemSource, CorpusLanguage, CuratedStatus, Topics} from 'content-common/dist/types';

describe('corpus scheduler lambda', () => {
    const scheduledCandidate = createScheduledCandidate(
        'Fake title',
        'fake excerpt',
        'https://fake-image-url.com',
        CorpusLanguage.EN,
        ['Fake Author'],
        'https://fake-url.com'
    );
    const record = createScheduledCandidates([scheduledCandidate]);

    beforeEach(() => {
        jest.spyOn(Utils, 'generateJwt').mockReturnValue('test-jwt');
        jest.spyOn(Utils, 'getCorpusSchedulerLambdaPrivateKey').mockReturnValue(Promise.resolve('my_secret_value'));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('lambda handler', () => {
        it('returns batch item failure if curated-corpus-api has error, with partial success', async () => {
            expect(Utils.generateJwt('fake-jwt')).toEqual('test-jwt');
            nock(config.AdminApi)
                .post('/') //parser / prospect-api call
                .reply(200, {
                    data: {
                        getUrlMetadata: {
                            url: 'https://fake-url.com',
                            title: 'Fake title',
                            excerpt: 'fake excerpt',
                            status: CuratedStatus.RECOMMENDATION,
                            language: 'EN',
                            publisher: 'POLITICO',
                            authors: 'Fake Author',
                            imageUrl: 'https://fake-image-url.com',
                            topic: Topics.SELF_IMPROVEMENT,
                            source: CorpusItemSource.ML,
                            isCollection: false,
                            isSyndicated: false,
                        },
                    },
                })
                .post('/') //curated-corpus-api call for first event
                .reply(200, {
                    data: {
                        createApprovedCorpusItem: {
                            externalId: 'fake-external-id',
                            url: 'https://fake-url.com',
                            title: 'Fake title'
                        },
                    },
                })
                .post('/') // failed curated-corpus-api call for second event
                .reply(200, { errors: [{ message: 'server bork' }] });
            const fakeEvent = {
                Records: [
                    { messageId: '1', body: JSON.stringify(record) },
                    { messageId: '2', body: JSON.stringify(record) },
                ],
            } as unknown as SQSEvent;

            const actual = await processor(fakeEvent, null as unknown as Context, null as unknown as Callback);

            expect(actual).toEqual({ batchItemFailures: [{ itemIdentifier: '2' }] });
        }, 7000);

        it('returns batch item failure if curated-corpus-api returns null data', async () => {
            nock(config.AdminApi).post('/').reply(200, { data: null });
            const fakeEvent = {
                Records: [{ messageId: '1', body: JSON.stringify(record) }],
            } as unknown as SQSEvent;
            const actual = await processor(fakeEvent, null as unknown as Context, null as unknown as Callback);
            expect(actual).toEqual({ batchItemFailures: [{ itemIdentifier: '1' }] });
        }, 7000);

        it('returns no batch item failures if curated-corpus-api request is successful', async () => {
            // mock createApprovedCorpusItem mutation
            jest.spyOn(CuratedCorpusApi, 'createApprovedCorpusItem').mockReturnValue(Promise.resolve({
                data: {
                    createApprovedCorpusItem: {
                        externalId: 'fake-external-id',
                        url: 'https://fake-url.com',
                        title: 'Fake title'
                    }
                }
            }));

            //nock the curatedCorpusApi call
            nock(config.AdminApi)
                .post('/') //parser / prospect-api call
                .reply(200, {
                    data: {
                        getUrlMetadata: {
                            url: 'https://fake-url.com',
                            title: 'Fake title',
                            excerpt: 'fake excerpt',
                            status: CuratedStatus.RECOMMENDATION,
                            language: 'EN',
                            publisher: 'POLITICO',
                            authors: 'Fake Author',
                            imageUrl: 'https://fake-image-url.com',
                            topic: Topics.SELF_IMPROVEMENT,
                            source: CorpusItemSource.ML,
                            isCollection: false,
                            isSyndicated: false,
                        },
                    },
                })
                .post('/') //curated-corpus-api call
                .reply(200, {
                    data: {
                        createApprovedCorpusItem: {
                            externalId: 'fake-external-id',
                            url: 'https://fake-url.com',
                            title: 'Fake title'
                        },
                    },
                });

            // create a fake SQS event
            const fakeEvent = {
                Records: [
                    { messageId: '1', body: JSON.stringify(record) }
                ],
            } as unknown as SQSEvent;

            const actual = await processor(fakeEvent, null as unknown as Context, null as unknown as Callback);

            // we should get no failed items
            expect(actual).toEqual({
                batchItemFailures: [],
            });
        }, 7000);
    });
});
