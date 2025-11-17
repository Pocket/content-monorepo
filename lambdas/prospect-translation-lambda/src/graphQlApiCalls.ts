import { UrlMetadata } from 'content-common';
import {
  getUrlMetadata as getUrlMetadataCommon,
  GraphQlApiCallHeaders,
} from 'lambda-common';

/**
 * this function wraps the common function for the purposes of easily mocking in tests
 *
 * @param adminApiEndpoint string
 * @param graphHeaders GraphQlApiHeaders object
 * @param url string
 * @returns Promise<UrlMetadata>
 */
export async function getUrlMetadata(
  adminApiEndpoint: string,
  graphHeaders: GraphQlApiCallHeaders,
  url: string,
): Promise<UrlMetadata> {
  return await getUrlMetadataCommon(adminApiEndpoint, graphHeaders, url);
}
