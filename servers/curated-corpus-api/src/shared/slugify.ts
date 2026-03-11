import slugify from 'slugify';
import { UserInputError } from '@pocket-tools/apollo-utils';

/**
 * Generates a slug from a title string.
 * Transliterates to ASCII, lowercases, replaces spaces with hyphens,
 * and removes special characters.
 */
export function titleToSlug(title: string): string {
  const raw = slugify(title, { lower: true, strict: true });

  if (!raw) {
    throw new UserInputError(
      'Cannot generate a slug from the provided title. Please use a title with alphanumeric characters.',
    );
  }

  return raw;
}

/**
 * Resolves a unique slug from a base slug and a list of existing colliding
 * externalIds. If the base slug is not taken, returns it directly. Otherwise,
 * appends -2, -3, etc. until a free slug is found.
 *
 * @param baseSlug - the slug generated from titleToSlug
 * @param collisions - array of existing externalIds that match the base slug
 *   or start with `${baseSlug}-`
 */
export function resolveSlugCollisions(
  baseSlug: string,
  collisions: string[],
): string {
  const collisionSet = new Set(collisions);

  if (!collisionSet.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (collisionSet.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }

  return `${baseSlug}-${suffix}`;
}
