import {
    generateJwt,
    getCorpusSchedulerLambdaPrivateKey,
    mapAuthorToApprovedItemAuthor,
    mapScheduledCandidateInputToCreateApprovedItemInput
} from './utils';
import config from './config';
import {mockClient} from 'aws-sdk-client-mock';
import {GetSecretValueCommand, SecretsManagerClient,} from '@aws-sdk/client-secrets-manager';
import {ApprovedItemAuthor, CorpusItemSource} from 'content-common/dist/types';
import {CorpusLanguage} from 'prospectapi-common';
import {createScheduledCandidate, expectedOutput, parserItem} from './testHelpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwkToPem = require('jwk-to-pem');

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('utils', function () {
    const ssmMock = mockClient(SecretsManagerClient);
    const testPrivateKey = {
        p: '2NE9Yskv7kZaM_OMvKElEWRKi6peRae3JkMp-TvjqMIO69kV3zQfpb0gfIdcC54_BuGUUUjL9IEDApWas-IBbG33bKoGTzCzNbfML0aQvAHpuvZI6pGAq3OdHgC-kGjb5wyK3tDaP-rS8aVYjrB9jQY7Go-F4xWyikNm-99BJg0',
        kty: 'RSA',
        q: 't8a8oOBF-MGnIuQBYlMzUa0YdpnQY2zLOfkocEoRbUNtaUZW-UEwaqy2q9rbQksM6j9LVY8jAzb0YvAag8TorCZlbhvmlZONqq5I_Reto1FPRNXLGJjHVMTonLRboCiSm_EFisZHPvgqAxln00MNAqRQnUnbP5CbCY4RrdNXjTU',
        d: 'h5bNYEjOE7wRUms-2mawI6MEqy5F1GmT8uZeVzEeGxfBHmPk2zVipN_YrmbNxCfyxKX_kbY2NbwcCBhUUs7_-v0D5JtJrr2fPEOQAi6snaHal264h5xXv6_Z_nQOYkEp8OYreNWrt9heG2DGPhNlHBEn-yVxcEw9KFl4ABwQhFdzf2PuyTytITlLjqrUWTYDciH3LJSnRyFiO45mii3RvJFmcivSFyyXiH-IFGC60ZyWYswHE8ITD9tENUX5vC-PTLMN71AIaXoGRNHaFHfsJmxbtwPBXkSShk5CRc-YqVNQvDX35KFFx0qnPd5ARWPi9iTzbP4Zyx3eoN37G8eTUQ',
        e: 'AQAB',
        use: 'sig',
        kid: 'helloworld',
        qi: 'PJ5W_ANyXuLmsMuCDPlhF8q3G490j3VbxqwjRPKeboxCinAskm7VnQJjZJPBw0_A565YJeEOWjbfauBax-4YaHmOK6wYd1sfTXSq6r5id58fWMmSu8ToZe8sziN5R9kvmrIKrddnS5NtvDQIaZJRUpbfMEzN8JouC--Oylzfwrs',
        dp: 'uamznzwYxzmHVKViBsUXMOVo0GB7iboso58v-jTGpmRG0r96cz_3Ob3Sa9CdiXVhE0tn7pMf06gGI9hoOVF3Vpp0HaEa9gUF8SIKvxD2L4iT1X3Awt0GCcte56pLhO3GIPwkjtjZi5JSQIsOYmHPoUuMoRn11Jdn4-4D6fsrlqE',
        alg: 'RS256',
        dq: 'HG5vokfwK1LyY5B4sliC2QD5hue2-JrNOhPU8MJUvd2voJjUPc2bCvXbcOzz_OaVgev24K67UPUAjAnvYDFnebKbAJTqcHuacCx0eEtgfqLGq7STriN8ux2Xix7QChAc1mlMXTLdtN05yq70hBecfKslGaBifgwGIE1NaOIIan0',
        n: 'm6XkeQIGIK44RK44g__-UwzW2cApDNy1H2dCnisrYmJj8QuyEBcFQs9y8PZtYTV3u1fm9awVs-E_SNqy62I6IaTaDwABetjQSNV1-q0NgwpBjcvwldNc2gyt9NNvxE5Yto5RKolZejkAU4GcPgNXah3fgoGZ59IJLVLDl9y9dnYtQwhHZ08k0RqsWTtQTUU9DFN6N7c9d0mOMCet8HbvcTYpT7zcRjAwplpvmo2TAN3iiNRlalyGrxNx2NECewsrDz7oiCutppWUWSa0oIJc0xRGegx4zOMEyPd72Z2Q6-JcxCKjcAIRknOhGyp3pMZZT3lTuoSYK0kbDDFlv90JsQ',
    };

    const testPublicKey = {
        kty: 'RSA',
        e: 'AQAB',
        use: 'sig',
        kid: 'helloworld',
        alg: 'RS256',
        n: 'm6XkeQIGIK44RK44g__-UwzW2cApDNy1H2dCnisrYmJj8QuyEBcFQs9y8PZtYTV3u1fm9awVs-E_SNqy62I6IaTaDwABetjQSNV1-q0NgwpBjcvwldNc2gyt9NNvxE5Yto5RKolZejkAU4GcPgNXah3fgoGZ59IJLVLDl9y9dnYtQwhHZ08k0RqsWTtQTUU9DFN6N7c9d0mOMCet8HbvcTYpT7zcRjAwplpvmo2TAN3iiNRlalyGrxNx2NECewsrDz7oiCutppWUWSa0oIJc0xRGegx4zOMEyPd72Z2Q6-JcxCKjcAIRknOhGyp3pMZZT3lTuoSYK0kbDDFlv90JsQ',
    };
    const now = new Date('2021-01-01 10:20:30');
    const exp = new Date('2021-01-01 10:25:30');
    
    beforeAll(() => {
        jest.useFakeTimers({
            now: now,
            advanceTimers: true,
        });
    });

    beforeEach(() => ssmMock.reset());

    afterEach(() => jest.clearAllMocks());

    afterAll(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });
    describe('generateJwt', () => {
        it('should generate jwt from given private key', () => {
            const token = generateJwt(testPrivateKey);

            const result = jwt.verify(token, jwkToPem(testPublicKey), {
                complete: true,
            });

            const payload = result.payload;

            expect(payload.iat).toEqual(now.getTime() / 1000);
            expect(payload.exp).toEqual(exp.getTime() / 1000);
            // Required by client-api for disambiguation
            expect(payload.name).toEqual(config.jwt.name);
            expect(payload['custom:groups']).toEqual(JSON.stringify(config.jwt.groups));
            expect(payload.identities).toEqual([{ userId: config.jwt.userId }]);
            // Required by client-api for disambiguation
            expect(result.header.kid).toEqual('helloworld');
        });
    });
    describe('getCorpusSchedulerLambdaPrivateKey', () => {
        it('should get the CorpusSchedulerLambda/Dev/JWT_KEY secret from SecretsManager', async () => {
            ssmMock.on(GetSecretValueCommand).resolves({SecretString: JSON.stringify({my_secret_key: 'my_secret_value'})});
            const privateKey = await getCorpusSchedulerLambdaPrivateKey('secret_key');
            expect(privateKey.my_secret_key).toEqual('my_secret_value');
        });
    });
    describe('mapAuthorToApprovedItemAuthor', () => {
        it('should create an ApprovedItemAuthor[] from a string array of author names', async () => {
            const authors = mapAuthorToApprovedItemAuthor(['Rose Essential', 'Floral Street']);
            const expectedAuthors: ApprovedItemAuthor[] = [
                {
                    name: 'Rose Essential',
                    sortOrder: 1
                },
                {
                    name: 'Floral Street',
                    sortOrder: 2
                }
            ]
            expect(authors).toEqual(expectedAuthors);
        });
    });
    describe('mapScheduledCandidateInputToCreateApprovedItemInput', () => {
        it('should map correctly a ScheduledCandidate to CreateApprovedItemInput', async () => {
            const scheduledCandidate = createScheduledCandidate(
                'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
                'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
                'https://fake-image-url.com',
                CorpusLanguage.EN,
                ['Rebecca Jennings']
            );
            const output = await mapScheduledCandidateInputToCreateApprovedItemInput(scheduledCandidate, parserItem);
            expect(output).toEqual(expectedOutput);
        });
        it('should map correctly a ScheduledCandidate to CreateApprovedItemInput & fallback on Parser fields for undefined optional ScheduledCandidate fields', async () => {
            // all optional fields are undefined and should be taken from the Parser
            const scheduledCandidate = createScheduledCandidate();
            expect(scheduledCandidate.scheduled_corpus_item.title).toBeUndefined();
            expect(scheduledCandidate.scheduled_corpus_item.excerpt).toBeUndefined();
            expect(scheduledCandidate.scheduled_corpus_item.language).toBeUndefined();
            expect(scheduledCandidate.scheduled_corpus_item.authors).toBeUndefined();
            expect(scheduledCandidate.scheduled_corpus_item.image_url).toBeUndefined();
            const output = await mapScheduledCandidateInputToCreateApprovedItemInput(scheduledCandidate, parserItem);
            expect(output).toEqual(expectedOutput);
        });
        it('should throw Error on ScheduleCandidate if field types are wrong', async () => {
            const badScheduledCandidate = createScheduledCandidate(
                undefined,
                undefined,
                undefined,
                'en' as CorpusLanguage, // should be 'EN', typia assert should fail
            );

            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(badScheduledCandidate, parserItem)
            ).rejects.toThrow(Error);
            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(badScheduledCandidate, parserItem)
            ).rejects.toThrow(`failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedItemInput. ` +
            `Reason: Error: Error on typia.assert(): invalid type on $input.scheduled_corpus_item.language, expect to be ("DE" | "EN" | "ES" | "FR" | "IT" | undefined)`);
        });
        it('should throw Error on ScheduleCandidate if source is not ML', async () => {
            const badScheduledCandidate = createScheduledCandidate(
                'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
                'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
                'https://fake-image-url.com',
                CorpusLanguage.EN,
                ['Rebecca Jennings'],
                undefined,
                CorpusItemSource.MANUAL
            );

            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(badScheduledCandidate, parserItem)
            ).rejects.toThrow(Error);
            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(badScheduledCandidate, parserItem)
            ).rejects.toThrow(`failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedItemInput. ` +
                `Reason: Error: invalid source (MANUAL) for a4b5d99c-4c1b-4d35-bccf-6455c8df07b0`);
        });
        it('should throw Error on CreateApprovedItemInput if field types are wrong', async () => {
            const scheduledCandidate = createScheduledCandidate(
                'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
                'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
                'https://fake-image-url.com',
                CorpusLanguage.EN,
                ['Rebecca Jennings']
            );
            parserItem.publisher = 1 as unknown as string; // force publisher to be the wrong type to trigger an Error

            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(scheduledCandidate, parserItem)
            ).rejects.toThrow(Error);
            await expect(
                mapScheduledCandidateInputToCreateApprovedItemInput(scheduledCandidate, parserItem)
            ).rejects.toThrow(`failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedItemInput. ` +
            `Reason: Error: Error on typia.assert(): invalid type on $input.publisher, expect to be string`);
        });
    });
});
