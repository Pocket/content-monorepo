import {
  RejectedCuratedCorpusItem,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
// the minimum of data required to create a rejected item
interface CreateRejectedCuratedCorpusItemHelperRequiredInput {
  title: string;
}

// optional information you can provide when creating a curated item
interface CreateRejectedCuratedCorpusItemHelperOptionalInput {
  prospectId?: string;
  url?: string;
  topic?: string;
  language?: string;
  publisher?: string;
  reason?: string;
}

// the input type the helper function expects - a combo of required and optional parameters
export type CreateRejectedCuratedCorpusItemHelperInput =
  CreateRejectedCuratedCorpusItemHelperRequiredInput &
    CreateRejectedCuratedCorpusItemHelperOptionalInput;

/**
 * A helper function that creates a sample curated item for testing or local development.
 * @param prisma
 * @param data
 */
export async function createRejectedCuratedCorpusItemHelper(
  prisma: PrismaClient,
  data: CreateRejectedCuratedCorpusItemHelperInput
): Promise<RejectedCuratedCorpusItem> {
  // defaults for optional properties
  const createRejectedCuratedCorpusItemDefaults = {
    prospectId: faker.string.uuid(),
    url: faker.internet.url(),
    topic: faker.lorem.words(2),
    language: faker.helpers.arrayElement(['EN', 'DE']),
    publisher: faker.company.name(),
    reason: faker.lorem.word(),
    createdAt: faker.date.recent({ days: 14 }),
    createdBy: faker.helpers.fake('{{hacker.noun}}|{{internet.email}}'), // imitation auth0 user id
  };

  const inputs: Prisma.RejectedCuratedCorpusItemCreateInput = {
    ...createRejectedCuratedCorpusItemDefaults,
    ...data,
  };

  return await prisma.rejectedCuratedCorpusItem.create({ data: inputs });
}
