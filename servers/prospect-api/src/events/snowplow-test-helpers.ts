import fetch from 'node-fetch';
import config from '../config';
import { ProspectReviewStatus, SnowplowProspect } from './types';

export const prospect: SnowplowProspect = {
  object_version: 'new',
  prospect_id: 'c586eff4-f69a-5e5b-8c4d-a4039bb5b497',
  url: 'https://www.nytimes.com/2022/11/03/t-magazine/spain-islamic-history.html',
  title: 'In Search of a Lost Spain',
  excerpt:
    'ON A MORNING of haunting heat in Seville, I sought out the tomb of Ferdinand III. There, in the Gothic cool, older Spaniards came and went, dropping to one knee and crossing themselves before the sepulcher of the Castilian monarch.',
  image_url:
    'https://static01.nyt.com/images/2022/11/03/t-magazine/03tmag-spain-slide-9VKO-copy/03tmag-spain-slide-9VKO-facebookJumbo.jpg',
  language: 'en',
  topic: 'EDUCATION',
  is_collection: false,
  is_syndicated: false,
  authors: ['RICHARD MOSSE', 'AATISH TASEER'],
  publisher: 'The New York Times',
  domain: 'nytimes.com',
  prospect_source: 'COUNTS_LOGISTIC_APPROVAL',
  scheduled_surface_id: 'NEW_TAB_EN_US',
  created_at: 1668100357,
  prospect_review_status: ProspectReviewStatus.Dismissed,
  // The Unix timestamp in seconds.
  reviewed_at: 1668100358,
  // The LDAP string of the curator who reviewed this prospect - for now, only dismissing prospect.
  reviewed_by: 'sso-user',
};

export async function snowplowRequest(
  path: string,
  post = false
): Promise<any> {
  const response = await fetch(
    `${config.snowplow.httpProtocol}://${config.snowplow.endpoint}${path}`,
    {
      method: post ? 'POST' : 'GET',
    }
  );
  return await response.json();
}

export async function resetSnowplowEvents(): Promise<void> {
  await snowplowRequest('/micro/reset', true);
}

export async function getAllSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/all');
}

export async function getGoodSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/good');
}

export async function getBadSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/bad');
}

export function parseSnowplowData(data: string): { [key: string]: any } {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}
