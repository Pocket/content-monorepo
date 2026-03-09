import slugify from 'slugify';
import { PrismaClient } from '.prisma/client';
import { UserInputError } from '@pocket-tools/apollo-utils';

// Based on collection-api config, extended to cover more special characters
const SLUGIFY_CONFIG = {
  lower: true,
  remove: /[*+~.()'"!:@?#$%^&{}|\\<>,;=/]/g,
};

// The longest custom section title in production is 47 characters. Slugs are
// shorter than titles (special characters removed), so 50 is comfortably above
// any observed value while keeping slugs tidy in analytics dashboards.
const MAX_SLUG_LENGTH = 50;

/**
 * Generates a slug from a title string.
 * Transliterates to ASCII, lowercases, replaces spaces with hyphens,
 * removes special characters, and hard-truncates at MAX_SLUG_LENGTH.
 */
export function titleToSlug(title: string): string {
  const raw = slugify(title, SLUGIFY_CONFIG);

  if (!raw) {
    throw new UserInputError(
      'Cannot generate a slug from the provided title. Please use a title with alphanumeric characters.',
    );
  }

  return raw.length <= MAX_SLUG_LENGTH ? raw : raw.substring(0, MAX_SLUG_LENGTH);
}

/**
 * Generates a unique section slug from a title, checking for collisions
 * globally against all sections (active and inactive). externalId has a
 * global unique constraint in the database.
 *
 * On collision, appends -2, -3, etc.
 */
export async function generateSectionSlug(
  title: string,
  db: PrismaClient,
): Promise<string> {
  const baseSlug = titleToSlug(title);

  // Check if the base slug is available (global uniqueness)
  const existing = await db.section.findUnique({
    where: { externalId: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  // Find all colliding slugs (exact match + suffixed variants like -2, -3)
  const collisions = await db.section.findMany({
    where: {
      OR: [
        { externalId: baseSlug },
        { externalId: { startsWith: `${baseSlug}-` } },
      ],
    },
    select: { externalId: true },
  });

  const collisionSet = new Set(collisions.map((s) => s.externalId));

  let suffix = 2;
  while (collisionSet.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }

  return `${baseSlug}-${suffix}`;
}
