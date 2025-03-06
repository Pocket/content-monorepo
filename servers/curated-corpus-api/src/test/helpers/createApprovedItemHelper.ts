import { Prisma, PrismaClient } from '.prisma/client';
import { faker } from '@faker-js/faker';

import {
  ApprovedItemAuthor,
  CorpusItemSource,
  CuratedStatus,
} from 'content-common';

import { ApprovedItem } from '../../database/types';
import { getNormalizedDomainName } from '../../shared/utils';

// the minimum of data required to create a approved curated item
interface CreateApprovedItemHelperRequiredInput {
  title: string;
}

// optional information you can provide when creating an approved curated item
interface CreateApprovedItemHelperOptionalInput {
  prospectId?: string;
  url?: string;
  excerpt?: string;
  status?: CuratedStatus;
  language?: string;
  publisher?: string;
  imageUrl?: string;
  createdBy?: string;
  topic?: string;
  source?: CorpusItemSource;
  isCollection?: boolean;
  isTimeSensitive?: boolean;
  isSyndicated?: boolean;
}

// the input type the helper function expects - a combo of required and optional parameters
export type CreateApprovedItemHelperInput =
  CreateApprovedItemHelperRequiredInput & CreateApprovedItemHelperOptionalInput;

/**
 * A helper function that creates a sample approved curated item for testing or local development.
 * @param prisma
 * @param data
 */
export async function createApprovedItemHelper(
  prisma: PrismaClient,
  data: CreateApprovedItemHelperInput,
): Promise<ApprovedItem> {
  const random = Math.round(Math.random() * 1000);

  // randomize number of authors
  const authorCount = faker.number.int({ min: 1, max: 3 });
  const authors: ApprovedItemAuthor[] = [];

  for (let i = 0; i < authorCount; i++) {
    authors.push({ name: faker.person.fullName(), sortOrder: i });
  }

  const url = `${faker.internet.url()}/${faker.lorem.slug()}/${faker.string.uuid()}`;
  const domainName = getNormalizedDomainName(data.url || url);

  // defaults for optional properties
  const createApprovedItemDefaults = {
    prospectId: faker.string.uuid(),
    // A URL that contains just a domain name is not enough as domain names
    // tend to get repeats even with ~100 items generated by the seed script,
    // so the URL needs a little more to stay reliably unique.
    url,
    domainName,
    excerpt: faker.lorem.sentence(15),
    authors: {
      create: authors,
    },
    status: faker.helpers.arrayElement([
      CuratedStatus.RECOMMENDATION,
      CuratedStatus.CORPUS,
    ]),
    language: faker.helpers.arrayElement(['EN', 'DE']),
    publisher: faker.company.name(),
    imageUrl: faker.helpers.arrayElement([
      `${faker.image.urlLoremFlickr({ category: 'nature' })}?random=${random}`,
      `${faker.image.urlLoremFlickr({ category: 'city' })}?random=${random}`,
      `${faker.image.urlLoremFlickr({ category: 'food' })}?random=${random}`,
    ]),
    // Plain strings for now, but we may be able to consume some sort of enum
    // from a "source of truth" API further down the track.
    topic: faker.helpers.arrayElement([
      'BUSINESS',
      'CAREER',
      'CORONAVIRUS',
      'EDUCATION',
      'ENTERTAINMENT',
      'FOOD',
      'GAMING',
      'HEALTH_FITNESS',
      'PARENTING',
      'PERSONAL_FINANCE',
      'POLITICS',
      'SCIENCE',
      'SELF_IMPROVEMENT',
      'SPORTS',
      'TECHNOLOGY',
      'TRAVEL',
    ]),
    source: faker.helpers.arrayElement([
      CorpusItemSource.PROSPECT,
      CorpusItemSource.MANUAL,
      CorpusItemSource.BACKFILL,
    ]),
    isCollection: faker.datatype.boolean(),
    isTimeSensitive: faker.datatype.boolean(),
    isSyndicated: faker.datatype.boolean(),
    createdAt: faker.date.recent({ days: 14 }),
    createdBy: faker.helpers.fake('{{hacker.noun}}|{{internet.email}}'), // imitation auth0 user id
    // occasionally, this may create an item that was updated before it was created. It's ok though,
    // we're only setting this so that orderBy in queries can be tested.
    updatedAt: faker.date.recent({ days: 7 }),
  };

  const inputs: Prisma.ApprovedItemCreateInput = {
    ...createApprovedItemDefaults,
    ...data,
  };

  return await prisma.approvedItem.create({
    data: inputs,
    include: { authors: { orderBy: [{ sortOrder: 'asc' }] } },
  });
}
