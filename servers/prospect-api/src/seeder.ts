import faker from '@faker-js/faker';
import config from './config';
import {
  dbClient,
  insertProspect,
  Prospect,
  ProspectType,
  ScheduledSurface,
  ScheduledSurfaces,
  Topics,
  truncateDb,
} from 'prospectapi-common';
import { CorpusLanguage } from './types';

// conjure up double the batch size so we get variance
const prospectsPerCombo = config.app.prospectBatchSize * 2;
let prospect: Prospect;

const buildProspect = (
  surfaceGuid: ScheduledSurface,
  prospectType: ProspectType
): Prospect => {
  const isSyndicated = faker.datatype.boolean();

  // randomize number of authors
  const authorCount = faker.datatype.number({ min: 1, max: 3 });
  const authors: string[] = [];

  for (let i = 0; i < authorCount; i++) {
    authors.push(faker.name.findName());
  }

  return {
    id: faker.datatype.uuid(),
    prospectId: faker.datatype.uuid(),
    scheduledSurfaceGuid: surfaceGuid.guid,
    topic: faker.random.arrayElement(Object.values(Topics)),
    prospectType,
    url: faker.internet.url(),
    saveCount: faker.datatype.number(),
    rank: faker.datatype.number(),
    // unix timestamp
    // at 3:14:07 on january 19, 2038 GMT, this value will exceed the int32 limit 🙃
    createdAt: Math.floor(faker.date.recent().getTime() / 1000),
    // below properties will be populated via client api/parser
    domain: faker.internet.domainName(),
    excerpt: faker.lorem.paragraph(),
    imageUrl: faker.image.imageUrl(),
    language: faker.random.arrayElement(Object.values(CorpusLanguage)),
    publisher: faker.company.companyName(),
    title: faker.lorem.sentence(),
    isSyndicated,
    // only potentially be a collection if it's *not* syndicated
    isCollection: isSyndicated ? false : faker.datatype.boolean(),
    authors: authors.join(','),
  };
};

const seed = async () => {
  // clear the database first
  await truncateDb(dbClient);

  // loop over each scheduled surface
  ScheduledSurfaces.forEach((surface) => {
    // loop over each prospect type for the surface
    surface.prospectTypes.forEach(async (prospectType) => {
      console.log(`inserting prospects for ${surface.guid}/${prospectType}...`);

      for (let i = 0; i < prospectsPerCombo; i++) {
        // generate a prospect
        prospect = buildProspect(surface, prospectType);

        // insert the prospect
        await insertProspect(dbClient, prospect);
      }
    });
  });
};

seed();
