import { OpenGraphFields } from '../../../shared/types';
import getMetaData from 'metadata-scraper';

/**
 *
 * @param parent
 * @param data Data contains a URL of the page to request
 */
export async function getOpenGraphFields(
  parent,
  { url }
): Promise<OpenGraphFields | null> {
  let pageMetadata = null;
  try {
    pageMetadata = await getMetaData(url, { maxRedirects: 2, timeout: 6000 });
  } catch (ex) {
    // empty
  }
  if (!pageMetadata?.description) return null;
  return {
    description: pageMetadata.description,
  };
}
