import slugify from 'slugify';
import { PrismaClient } from '.prisma/client';
import { UserInputError } from '@pocket-tools/apollo-utils';

// Based on collection-api config, extended to cover more special characters
const SLUGIFY_CONFIG = {
  lower: true,
  remove: /[*+~.()'"!:@?#$%^&{}|\\<>,;=\/]/g,
};

// Reserve 4 chars for collision suffix (e.g. "-999")
const MAX_SLUG_LENGTH = 46;

/**
 * Generates a slug from a title string.
 * Transliterates to ASCII, lowercases, replaces spaces with hyphens,
 * removes special characters, and truncates to MAX_SLUG_LENGTH at a
 * word boundary.
 */
export function titleToSlug(title: string): string {
  const raw = slugify(title, SLUGIFY_CONFIG);

  if (!raw) {
    throw new UserInputError(
      'Cannot generate a slug from the provided title. Please use a title with alphanumeric characters.',
    );
  }

  if (raw.length <= MAX_SLUG_LENGTH) {
    return raw;
  }

  // Truncate at last hyphen before the limit to avoid cutting mid-word
  const truncated = raw.substring(0, MAX_SLUG_LENGTH);
  const lastHyphen = truncated.lastIndexOf('-');

  return lastHyphen > 0 ? truncated.substring(0, lastHyphen) : truncated;
}

/**
 * Generates a unique section slug from a title, checking for collisions
 * against all sections (active and inactive) within the same
 * scheduledSurfaceGuid.
 *
 * On collision, appends -2, -3, etc.
 */
export async function generateSectionSlug(
  title: string,
  scheduledSurfaceGuid: string,
  db: PrismaClient,
): Promise<string> {
  const baseSlug = titleToSlug(title);

  // Check if the base slug is available
  const existing = await db.section.findFirst({
    where: {
      externalId: baseSlug,
      scheduledSurfaceGuid,
    },
  });

  if (!existing) {
    return baseSlug;
  }

  // Find all colliding slugs to determine the next suffix
  const collisions = await db.section.findMany({
    where: {
      scheduledSurfaceGuid,
      externalId: { startsWith: baseSlug },
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
