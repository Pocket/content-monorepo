import { getUrlMetadata } from '.';
import * as lib from './lib';
import * as PublisherDomain from '../../../../database/mutations/PublisherDomain';
import { IAdminContext } from '../../../context';

describe('lib', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUrlMetadata', () => {
    it('throws when the given URL is invalid', async () => {
      const badUrl = 'not url!';

      await expect(
        getUrlMetadata(
          null,
          {
            url: badUrl,
          },
          null,
        ),
      ).rejects.toThrow(`${badUrl} is not a valid url`);
    });

    it('calls to fetch metadata, convert the metadata, and derive a publisher and returns a UrlMetadata object', async () => {
      const publisher = 'Publisho-Mat';

      const expectedReturn = {
        url: 'https://www.veschwab.com/threads',
        domain: 'veschwab.com',
        publisher: publisher,
      };

      const fetchUrlMetadataSpy = jest
        .spyOn(lib, 'fetchUrlMetadata')
        .mockReturnValue(Promise.resolve({}));

      const convertParserJsonToUrlMetadataSpy = jest
        .spyOn(lib, 'convertParserJsonToUrlMetadata')
        .mockReturnValue({
          url: 'https://www.veschwab.com/threads',
          domain: 'veschwab.com',
        });

      const lookupPublisherSpy = jest
        .spyOn(PublisherDomain, 'lookupPublisher')
        .mockReturnValue(Promise.resolve(publisher));

      const url =
        'https://arstechnica.com/tech-policy/2025/11/widespread-cloudflare-outage-blamed-on-mysterious-traffic-spike/';

      const result = await getUrlMetadata(
        null,
        {
          url,
        },
        {
          db: {},
          authenticatedUser: {
            graphClientName: 'Spec Test Client',
          },
        } as any as IAdminContext,
      );

      expect(fetchUrlMetadataSpy).toHaveBeenCalledTimes(1);
      expect(convertParserJsonToUrlMetadataSpy).toHaveBeenCalledTimes(1);
      expect(lookupPublisherSpy).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedReturn);
    });

    it('successfully returns when a publisher value could not be found', async () => {
      const expectedReturn = {
        url: 'https://www.veschwab.com/threads',
        domain: 'veschwab.com',
      };

      const fetchUrlMetadataSpy = jest
        .spyOn(lib, 'fetchUrlMetadata')
        .mockReturnValue(Promise.resolve({}));

      const convertParserJsonToUrlMetadataSpy = jest
        .spyOn(lib, 'convertParserJsonToUrlMetadata')
        .mockReturnValue({
          url: 'https://www.veschwab.com/threads',
          domain: 'veschwab.com',
        });

      const lookupPublisherSpy = jest
        .spyOn(PublisherDomain, 'lookupPublisher')
        .mockReturnValue(Promise.resolve(null));

      const url =
        'https://arstechnica.com/tech-policy/2025/11/widespread-cloudflare-outage-blamed-on-mysterious-traffic-spike/';

      const result = await getUrlMetadata(
        null,
        {
          url,
        },
        {
          db: {},
          authenticatedUser: {
            graphClientName: 'Spec Test Client',
          },
        } as any as IAdminContext,
      );

      expect(fetchUrlMetadataSpy).toHaveBeenCalledTimes(1);
      expect(convertParserJsonToUrlMetadataSpy).toHaveBeenCalledTimes(1);
      expect(lookupPublisherSpy).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedReturn);
    });
  });
});
