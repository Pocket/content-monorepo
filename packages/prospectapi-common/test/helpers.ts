import { faker } from '@faker-js/faker';

import { CorpusLanguage, Prospect, ProspectType, Topics } from '../types';

// turn the enum into an array so we can grab a random one easily
const topicsArray = Object.keys(Topics).map((key) => Topics[key]);

/**
 * creates a Prospect object with the specified scheduledSurface, prospectType,
 * and curated status. the rest of the data will be faker faked.
 *
 * this may warrant future refactoring if we want control over more than just
 * the three data points / parameters
 *
 * @param scheduledSurfaceGuid string new tab GUID
 * @param prospectType ProspectType enum value
 * @param curated boolean
 * @returns Prospect
 */
export const createProspect = (
  scheduledSurfaceGuid: string,
  prospectType: ProspectType,
  curated = false,
): Prospect => {
  // randomize number of authors
  const authorCount = faker.number.int({ min: 1, max: 3 });
  const authors: string[] = [];

  for (let i = 0; i < authorCount; i++) {
    authors.push(faker.person.fullName());
  }

  return {
    id: faker.string.uuid(),
    prospectId: faker.string.uuid(),
    scheduledSurfaceGuid,
    topic: faker.helpers.arrayElement(topicsArray),
    prospectType,
    url: faker.internet.url(),
    rank: faker.number.int(),
    saveCount: faker.number.int(),
    curated,
    createdAt: Math.floor(faker.date.recent().valueOf() / 1000),
    domain: faker.internet.domainName(),
    excerpt: faker.lorem.paragraph(),
    imageUrl: faker.internet.url(),
    language: faker.helpers.arrayElement(Object.values(CorpusLanguage)),
    publisher: faker.helpers.arrayElement([
      'The New York Times',
      'The Atlantic',
      'The Guardian',
      'The Register',
    ]),
    title: faker.lorem.words(),
    isSyndicated: faker.datatype.boolean(),
    isCollection: faker.datatype.boolean(),
    authors: authors.join(','),
  };
};
