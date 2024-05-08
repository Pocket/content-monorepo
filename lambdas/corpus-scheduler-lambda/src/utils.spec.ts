import {
  createAndScheduleCorpusItemHelper,
  createCreateScheduledItemInput,
  generateJwt,
  getCorpusSchedulerLambdaPrivateKey,
  mapAuthorToApprovedItemAuthor,
  mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput,
  validateDatePublished,
} from './utils';
import config from './config';
import { mockClient } from 'aws-sdk-client-mock';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { setupServer } from 'msw/node';
import {
  ApprovedItemAuthor,
  CorpusItemSource,
  CorpusLanguage,
  UrlMetadata,
} from 'content-common';
import {
  createScheduledCandidate,
  defaultScheduledDate,
  expectedOutput,
  mockCreateApprovedCorpusItemOnce,
  mockCreateScheduledCorpusItemOnce,
  mockGetApprovedCorpusItemByUrl,
  mockGetUrlMetadata,
  mockPocketImageCache,
  mockSnowplow,
  parserItem,
} from './testHelpers';
import { getEmitter, getTracker } from 'content-common/snowplow';
import * as validation from './validation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwkToPem = require('jwk-to-pem');

// Referenced from: https://github.com/Pocket/curation-tools-data-sync/blob/main/curation-authors-backfill/jwt.spec.ts
describe('utils', function () {
  const server = setupServer();
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

  const emitter = getEmitter();
  const tracker = getTracker(emitter, config.snowplow.appId);

  beforeAll(() => {
    server.listen();
    jest.useFakeTimers({
      now: now,
      advanceTimers: true,
    });
  });

  beforeEach(() => ssmMock.reset());

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
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
      expect(payload['custom:groups']).toEqual(
        JSON.stringify(config.jwt.groups),
      );
      expect(payload.identities).toEqual([{ userId: config.jwt.userId }]);
      // Required by client-api for disambiguation
      expect(result.header.kid).toEqual('helloworld');
    });
  });
  describe('getCorpusSchedulerLambdaPrivateKey', () => {
    it('should get the CorpusSchedulerLambda/Dev/JWT_KEY secret from SecretsManager', async () => {
      ssmMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify({ my_secret_key: 'my_secret_value' }),
      });
      const privateKey = await getCorpusSchedulerLambdaPrivateKey('secret_key');
      expect(privateKey.my_secret_key).toEqual('my_secret_value');
    });
  });
  describe('createCreateScheduledItemInput', () => {
    it('should create CreateScheduledItemInput correctly', async () => {
      const scheduledCandidate = createScheduledCandidate();
      const output = await createCreateScheduledItemInput(
        scheduledCandidate,
        'fake-approved-external-id',
      );
      const expectedApprovedItemOutput = {
        approvedItemExternalId: 'fake-approved-external-id',
        scheduledSurfaceGuid: 'NEW_TAB_EN_US',
        scheduledDate: defaultScheduledDate as string,
        source: 'ML',
      };

      expect(output).toEqual(expectedApprovedItemOutput);
    });
    it('should throw error on CreateScheduledItemInput if a field type is wrong', async () => {
      const badCandidate: any = createScheduledCandidate();
      badCandidate.scheduled_corpus_item['source'] =
        'bad-source' as CorpusItemSource.ML;
      await expect(
        createCreateScheduledItemInput(
          badCandidate,
          'fake-approved-external-id',
        ),
      ).rejects.toThrow(
        `failed to create CreateScheduledItemInput for a4b5d99c-4c1b-4d35-bccf-6455c8df07b0. ` +
          `Reason: Error: Error on typia.assert(): invalid type on $input.source, expect to be ("MANUAL" | "ML")`,
      );
    });
  });
  describe('createAndScheduleCorpusItemHelper', () => {
    it('should schedule a previously approved item', async () => {
      mockSnowplow(server);
      // approvedCorpusItem should return a response, not null
      mockGetApprovedCorpusItemByUrl(server);
      mockGetUrlMetadata(server);
      mockCreateScheduledCorpusItemOnce(server);
      mockCreateApprovedCorpusItemOnce(server);

      // spy on console.log
      const consoleLogSpy = jest.spyOn(global.console, 'log');

      const scheduledCandidate = createScheduledCandidate();
      // no errors should be thrown from apis
      await expect(
        createAndScheduleCorpusItemHelper(
          scheduledCandidate,
          'fake-bearer-token',
          tracker,
        ),
      ).resolves.not.toThrowError();

      // we expect the createScheduledCorpusItem to run
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CreateScheduledCorpusItem MUTATION OUTPUT: {"data":{"createScheduledCorpusItem":{"externalId":"fake-scheduled-external-id-2","approvedItem":{"externalId":"fake-external-id","url":"https://fake-url.com","title":"Fake title"}}}}',
      );
    });
    it('should create, approve & schedule a new candidate', async () => {
      mockSnowplow(server);
      // approvedCorpusItem should return a response, not null
      mockGetApprovedCorpusItemByUrl(server, {
        data: {
          getApprovedCorpusItemByUrl: null,
        },
      });
      mockGetUrlMetadata(server);
      mockCreateScheduledCorpusItemOnce(server);
      mockCreateApprovedCorpusItemOnce(server);
      mockPocketImageCache(200);

      // spy on console.log
      const consoleLogSpy = jest.spyOn(global.console, 'log');

      const scheduledCandidate = createScheduledCandidate();
      // no errors should be thrown from apis
      await expect(
        createAndScheduleCorpusItemHelper(
          scheduledCandidate,
          'fake-bearer-token',
          tracker,
        ),
      ).resolves.not.toThrowError();

      // we expect the createScheduledCorpusItem to run
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CreateApprovedCorpusItem MUTATION OUTPUT: {"data":{"createApprovedCorpusItem":{"externalId":"fake-external-id","url":"https://fake-url.com","title":"Fake title","scheduledSurfaceHistory":[{"externalId":"143b8de8-0dc9-4613-b9f0-0e8837a2df1c"}]}}}',
      );
    });
  });
  describe('mapAuthorToApprovedItemAuthor', () => {
    it('should create an ApprovedItemAuthor[] from a string array of author names', async () => {
      const authors = mapAuthorToApprovedItemAuthor([
        'Rose Essential',
        'Floral Street',
      ]);
      const expectedAuthors: ApprovedItemAuthor[] = [
        {
          name: 'Rose Essential',
          sortOrder: 1,
        },
        {
          name: 'Floral Street',
          sortOrder: 2,
        },
      ];
      expect(authors).toEqual(expectedAuthors);
    });
  });
  describe('mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput', () => {
    it('should throw Error on CreateApprovedItemInput if field types are wrong (imageUrl)', async () => {
      // candidate & parser imageUrl both null
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.image_url =
        null as unknown as string;
      parserItem.imageUrl = null as unknown as string;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on typia.assert(): invalid type on $input.imageUrl, expect to be string`,
        ),
      );
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply title formatting if candidate is EN', async () => {
      // set parser image url to something different from candidate imageUrl
      parserItem.imageUrl = 'https://different-image.com';
      const scheduledCandidate = createScheduledCandidate();
      const validateImageSpy = jest
        .spyOn(validation, 'validateImageUrl')
        .mockReturnValue(
          Promise.resolve(
            scheduledCandidate.scheduled_corpus_item.image_url as string,
          ),
        );
      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );
      expect(validateImageSpy).toHaveBeenCalled(); //=> true
      expect(output.imageUrl).not.toBeNull();
      // check that AP style has been applied
      expect(output.title).not.toEqual(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
      );
      expect(output.title).toEqual(
        'Romantic Norms Are in Flux. No Wonder Everyone’s Obsessed With Polyamory.',
      );
      // should be english language
      expect(output.language).toEqual(CorpusLanguage.EN);
      // should equal https://fake-image-url.com and not https://different-image.com
      expect(output.imageUrl).toEqual('https://fake-image-url.com');
      expect(output).toEqual(expectedOutput);
      // set parser image url to default
      parserItem.imageUrl = scheduledCandidate.scheduled_corpus_item.image_url;
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & NOT apply title formatting if candidate is not EN', async () => {
      // set parser image url to something different from candidate imageUrl
      parserItem.imageUrl = 'https://different-image.com';
      parserItem.language = CorpusLanguage.DE;
      expectedOutput.language = CorpusLanguage.DE;
      expectedOutput.title =
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.';
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.language = CorpusLanguage.DE;
      const validateImageSpy = jest
        .spyOn(validation, 'validateImageUrl')
        .mockReturnValue(
          Promise.resolve(
            scheduledCandidate.scheduled_corpus_item.image_url as string,
          ),
        );
      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );
      expect(validateImageSpy).toHaveBeenCalled(); //=> true
      expect(output.imageUrl).not.toBeNull();
      // check that AP style has NOT been applied
      expect(output.title).not.toEqual(
        'Romantic Norms Are in Flux. No Wonder Everyone’s Obsessed With Polyamory.',
      );
      expect(output.title).toEqual(
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
      );
      // should be german language
      expect(output.language).toEqual(CorpusLanguage.DE);
      // should equal https://fake-image-url.com and not https://different-image.com
      expect(output.imageUrl).toEqual('https://fake-image-url.com');
      expect(output).toEqual(expectedOutput);
      // reset values to default
      parserItem.imageUrl = scheduledCandidate.scheduled_corpus_item.image_url;
      parserItem.language = CorpusLanguage.EN;
      expectedOutput.language = CorpusLanguage.EN;
      expectedOutput.title =
        'Romantic Norms Are in Flux. No Wonder Everyone’s Obsessed With Polyamory.';
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & apply curly quotes formatting on excerpt', async () => {
      // set parser image url to something different from candidate imageUrl
      parserItem.imageUrl = 'https://different-image.com';
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.excerpt = `Random "excerpt"`;
      // curly quotes should be applied
      expectedOutput.excerpt = `Random “excerpt”`;
      const validateImageSpy = jest
        .spyOn(validation, 'validateImageUrl')
        .mockReturnValue(
          Promise.resolve(
            scheduledCandidate.scheduled_corpus_item.image_url as string,
          ),
        );
      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );
      expect(validateImageSpy).toHaveBeenCalled(); //=> true
      expect(output.imageUrl).not.toBeNull();
      // check that double curly apostrophes have been applied
      expect(output.excerpt).not.toEqual(`Random "excerpt"`);
      expect(output.excerpt).toEqual(`Random “excerpt”`);
      // should equal https://fake-image-url.com and not https://different-image.com
      expect(output.imageUrl).toEqual('https://fake-image-url.com');
      expect(output).toEqual(expectedOutput);
      // set parser image url to default
      parserItem.imageUrl = scheduledCandidate.scheduled_corpus_item.image_url;
      expectedOutput.excerpt =
        'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.';
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & fallback on Parser fields for undefined optional ScheduledCandidate fields', async () => {
      mockPocketImageCache(200);
      // all optional fields are undefined and should be taken from the Parser
      const scheduledCandidate = createScheduledCandidate({
        title: undefined,
        excerpt: undefined,
        language: undefined,
        authors: undefined,
        image_url: undefined,
      });

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );
      expect(output).toEqual(expectedOutput);
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedCorpusItemApiInput & fallback on Metaflow authors if Parser returns null for authors', async () => {
      mockPocketImageCache(200);
      const scheduledCandidate = createScheduledCandidate();
      const incompleteParserItem: UrlMetadata = {
        url: 'https://www.politico.com/news/magazine/2024/02/26/former-boeing-employee-speaks-out-00142948',
        title:
          'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.',
        excerpt:
          'In the conversation about open marriages and polyamory, America’s sexual anxieties are on full display.',
        language: 'EN',
        publisher: 'POLITICO',
        authors: undefined,
        imageUrl: 'https://fake-image-url.com',
        isCollection: false,
        isSyndicated: false,
      };

      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          incompleteParserItem,
        );
      expect(output).toEqual(expectedOutput);
    });
    it('should map correctly a ScheduledCandidate to CreateApprovedItemInput & fallback on valid Parser imageUrl if Metaflow imageUrl is not valid', async () => {
      const scheduledCandidate = createScheduledCandidate();
      // force metaflow imageUrl to be null to fallback on Parser
      scheduledCandidate.scheduled_corpus_item.image_url =
        null as unknown as string;

      // set parser.imageUrl
      parserItem.imageUrl = 'https://new-fake-image.com';
      expectedOutput.imageUrl = parserItem.imageUrl;
      const validateImageSpy = jest
        .spyOn(validation, 'validateImageUrl')
        .mockReturnValue(Promise.resolve(parserItem.imageUrl as string));
      const output =
        await mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        );
      expect(validateImageSpy).toHaveBeenCalled(); //=> true
      expect(output.imageUrl).not.toBeNull();
      expect(output.imageUrl).toEqual('https://new-fake-image.com');
      expect(output).toEqual(expectedOutput);

      // set parser image url to default
      parserItem.imageUrl = 'https://fake-image-url.com';
      expectedOutput.imageUrl = parserItem.imageUrl;
    });
    it('should throw Error on CreateApprovedItemInput if field types are wrong (title)', async () => {
      mockPocketImageCache(200);
      const scheduledCandidate = createScheduledCandidate();
      scheduledCandidate.scheduled_corpus_item.title = undefined;
      parserItem.title = undefined;

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          parserItem,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on typia.assert(): invalid type on $input.title, expect to be string`,
        ),
      );
      parserItem.title =
        'Romantic norms are in flux. No wonder everyone’s obsessed with polyamory.';
    });
    it('should throw Error on CreateApprovedItemInput if field types are wrong (publisher)', async () => {
      mockPocketImageCache(200);
      const scheduledCandidate = createScheduledCandidate();

      const invalidParserItem: any = {
        ...parserItem,
        publisher: 1,
      };

      await expect(
        mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
          scheduledCandidate,
          invalidParserItem,
        ),
      ).rejects.toThrow(
        new Error(
          `failed to map a4b5d99c-4c1b-4d35-bccf-6455c8df07b0 to CreateApprovedCorpusItemApiInput. ` +
            `Reason: Error: Error on typia.assert(): invalid type on $input.publisher, expect to be string`,
        ),
      );
    });
  });

  describe('validateDatePublished', () => {
    it('should return null if a date is not provided', () => {
      const testDate = undefined;

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toBeNull();
    });

    it('should return null if an invalid date is provided', () => {
      const testDate = 'BLIMP';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toBeNull();
    });

    it('should return a formatted date if a Parser-style date is provided', () => {
      const testDate = '2024-01-03 23:48:34';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toEqual('2024-01-03');
    });

    it('should return a formatted date if a Collections-style date is provided', () => {
      const testDate = '2024-04-11';

      const returnDate = validateDatePublished(testDate);

      expect(returnDate).toEqual('2024-04-11');
    });
  });
});
