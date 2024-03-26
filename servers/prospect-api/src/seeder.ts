import { faker, fakerDE, fakerES, fakerFR, fakerIT } from '@faker-js/faker';
import { ProspectType } from 'content-common';
import {
  dbClient,
  insertProspect,
  Prospect,
  ScheduledSurface,
  ScheduledSurfaces,
  truncateDb,
} from 'prospectapi-common';
import config from './config';

import { CorpusLanguage, Topics } from './types';

// conjure up double the batch size so we get variance
const prospectsPerCombo = config.app.prospectBatchSize * 2;
let prospect: Prospect;

const langToFakerLocale = {
  EN: faker,
  DE: fakerDE,
  ES: fakerES,
  FR: fakerFR,
  IT: fakerIT,
};

const buildProspect = (
  surfaceGuid: ScheduledSurface,
  prospectType: ProspectType,
): Prospect => {
  const isSyndicated = faker.datatype.boolean();
  const random = Math.round(Math.random() * 1000);

  // randomize number of authors
  const authorCount = faker.number.int({ min: 1, max: 3 });
  const authors: string[] = [];

  for (let i = 0; i < authorCount; i++) {
    authors.push(faker.person.fullName());
  }

  const guidLang = surfaceGuid.guid.split('_').slice(-2)[0];
  const corpusLang =
    Object.keys(CorpusLanguage).indexOf(guidLang) == -1
      ? faker.helpers.arrayElement(Object.values(CorpusLanguage))
      : guidLang;
  const fakerLocale = langToFakerLocale[corpusLang];

  const imageCat = faker.helpers.arrayElement([
    'city',
    'animals',
    'business',
    'cats',
    'city',
    'food',
    'nightlife',
    'fashion',
    'people',
    'nature',
    'sports',
    'technics',
    'transport',
  ]);

  return {
    id: faker.string.uuid(),
    prospectId: faker.string.uuid(),
    scheduledSurfaceGuid: surfaceGuid.guid,
    topic: faker.helpers.arrayElement(Object.values(Topics)),
    prospectType,
    url: faker.internet.url(),
    saveCount: faker.number.int({ min: 0, max: 2 ** 31 }),
    rank: faker.number.int({ min: 0, max: 1e6 }),
    // unix timestamp
    // at 3:14:07 on january 19, 2038 GMT, this value will exceed the int32 limit 🙃
    createdAt: Math.floor(faker.date.recent().getTime() / 1000),
    // below properties will be populated via client api/parser
    domain: fakerLocale.internet.domainName(),
    excerpt: fakerLocale.word.words({ count: { min: 1, max: 100 } }),
    imageUrl: `${faker.image.urlLoremFlickr({
      category: imageCat,
    })}?random=${random}&height=640&width=480`,
    language: corpusLang,
    publisher: faker.company.name(),
    title: fakerLocale.word.words({ count: { min: 1, max: 10 } }),
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
