import { PrismaClient } from '.prisma/client';
import { titleToSlug, generateSectionSlug } from './slugify';

describe('titleToSlug', () => {
  it('should convert a simple title to a slug', () => {
    expect(titleToSlug('Breaking News')).toEqual('breaking-news');
  });

  it('should handle special characters', () => {
    expect(titleToSlug('What Is This Thing?')).toEqual('what-is-this-thing');
  });

  it('should handle colons and apostrophes', () => {
    expect(titleToSlug("Venezuela Strikes: What's to Know")).toEqual(
      'venezuela-strikes-whats-to-know',
    );
  });

  it('should handle slashes', () => {
    expect(titleToSlug('Obsession/Hobbies/Oddities')).toEqual(
      'obsessionhobbiesoddities',
    );
  });

  it('should handle question marks', () => {
    expect(titleToSlug('Who Knew?')).toEqual('who-knew');
  });

  it('should handle ampersands', () => {
    expect(titleToSlug('Rest & Relaxation')).toEqual('rest-and-relaxation');
  });

  it('should transliterate international characters to ASCII', () => {
    expect(titleToSlug('Für Dich')).toEqual('fur-dich');
    expect(titleToSlug('Café Résumé')).toEqual('cafe-resume');
    expect(titleToSlug('Haus und Garten')).toEqual('haus-und-garten');
  });

  it('should transliterate German umlauts', () => {
    expect(titleToSlug('Über Wissenschaft')).toEqual('uber-wissenschaft');
  });

  it('should throw UserInputError for a title that produces an empty slug', () => {
    expect(() => titleToSlug('???')).toThrow(
      'Cannot generate a slug from the provided title',
    );
  });

  it('should throw UserInputError for an empty title', () => {
    expect(() => titleToSlug('')).toThrow(
      'Cannot generate a slug from the provided title',
    );
  });
});

/**
 * Builds a mock PrismaClient where the given slugs already exist.
 * findUnique looks up by externalId; findMany returns all rows.
 */
function mockDbWithSlugs(...existing: string[]): PrismaClient {
  const rows = existing.map((externalId) => ({ externalId }));
  return {
    section: {
      findUnique: jest.fn().mockImplementation(({ where: { externalId } }) =>
        Promise.resolve(rows.find((r) => r.externalId === externalId) ?? null),
      ),
      findMany: jest.fn().mockResolvedValue(rows),
    },
  } as unknown as PrismaClient;
}

describe('generateSectionSlug', () => {
  const title = 'Breaking News';

  it('should return base slug when no collision exists', async () => {
    const slug = await generateSectionSlug(title, mockDbWithSlugs());
    expect(slug).toEqual('breaking-news');
  });

  it('should append -2 on first collision', async () => {
    const slug = await generateSectionSlug(
      title,
      mockDbWithSlugs('breaking-news'),
    );
    expect(slug).toEqual('breaking-news-2');
  });

  it('should skip taken suffixes', async () => {
    const slug = await generateSectionSlug(
      title,
      mockDbWithSlugs('breaking-news', 'breaking-news-2', 'breaking-news-3'),
    );
    expect(slug).toEqual('breaking-news-4');
  });

  it('should fill gaps in suffix sequence', async () => {
    const slug = await generateSectionSlug(
      title,
      mockDbWithSlugs('breaking-news', 'breaking-news-3'),
    );
    expect(slug).toEqual('breaking-news-2');
  });

  it('should not be confused by non-numeric suffixes in results', async () => {
    // "breaking-news-today" matches startsWith("breaking-news-") and
    // appears in findMany results, but the suffix loop only checks
    // numeric suffixes so it should not affect numbering.
    const slug = await generateSectionSlug(
      title,
      mockDbWithSlugs('breaking-news', 'breaking-news-today'),
    );
    expect(slug).toEqual('breaking-news-2');
  });
});
