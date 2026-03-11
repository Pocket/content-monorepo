import { titleToSlug, resolveSlugCollisions } from './slugify';

describe('titleToSlug', () => {
  it('should convert a simple title to a slug', () => {
    expect(titleToSlug('Breaking News')).toEqual('breaking-news');
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

  it('should strip leading and trailing whitespace', () => {
    expect(titleToSlug('  Breaking News  ')).toEqual('breaking-news');
  });

  it('should collapse multiple spaces, tabs, and newlines', () => {
    expect(titleToSlug('Breaking   News')).toEqual('breaking-news');
    expect(titleToSlug('Breaking\tNews')).toEqual('breaking-news');
    expect(titleToSlug('Breaking\nNews')).toEqual('breaking-news');
  });

  it('should normalize repeated hyphens', () => {
    expect(titleToSlug('Breaking--News')).toEqual('breaking-news');
    expect(titleToSlug('Breaking - News')).toEqual('breaking-news');
  });

  it('should remove underscores without adding a separator', () => {
    expect(titleToSlug('Breaking_News')).toEqual('breakingnews');
  });

  it('should handle periods and commas', () => {
    expect(titleToSlug('U.S.A. News, Today')).toEqual('usa-news-today');
  });

  it('should handle parentheses', () => {
    expect(titleToSlug('Breaking News (Live)')).toEqual('breaking-news-live');
  });

  it('should strip emojis', () => {
    expect(titleToSlug('Breaking 😅 News')).toEqual('breaking-news');
  });

  it('should treat spaced slashes as separators but collapse unspaced slashes', () => {
    expect(titleToSlug('A / B')).toEqual('a-b');
    expect(titleToSlug('A/B')).toEqual('ab');
  });

  it('should produce identical slugs for precomposed and combining characters', () => {
    expect(titleToSlug('Cafe\u0301')).toEqual(titleToSlug('Café'));
  });

  it('should transliterate ligatures and extended Latin characters', () => {
    expect(titleToSlug('Æsir')).toEqual('aesir');
    expect(titleToSlug('Œuvre')).toEqual('oeuvre');
    expect(titleToSlug('Łódź')).toEqual('lodz');
    expect(titleToSlug('Smørrebrød')).toEqual('smorrebrod');
    expect(titleToSlug('Dvořák')).toEqual('dvorak');
  });

  it('should be idempotent on already-slugified input', () => {
    expect(titleToSlug('breaking-news')).toEqual('breaking-news');
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

  it('should throw for whitespace-only and separator-only titles', () => {
    expect(() => titleToSlug('   ')).toThrow(
      'Cannot generate a slug from the provided title',
    );
    expect(() => titleToSlug('---')).toThrow(
      'Cannot generate a slug from the provided title',
    );
    expect(() => titleToSlug('///')).toThrow(
      'Cannot generate a slug from the provided title',
    );
  });
});

describe('resolveSlugCollisions', () => {
  it('should return base slug when no collisions exist', () => {
    expect(resolveSlugCollisions('breaking-news', [])).toEqual('breaking-news');
  });

  it('should append -2 on first collision', () => {
    expect(resolveSlugCollisions('breaking-news', ['breaking-news'])).toEqual(
      'breaking-news-2',
    );
  });

  it('should skip taken suffixes', () => {
    const collisions = ['breaking-news', 'breaking-news-2', 'breaking-news-3'];
    expect(resolveSlugCollisions('breaking-news', collisions)).toEqual(
      'breaking-news-4',
    );
  });

  it('should fill gaps in suffix sequence', () => {
    const collisions = ['breaking-news', 'breaking-news-3'];
    expect(resolveSlugCollisions('breaking-news', collisions)).toEqual(
      'breaking-news-2',
    );
  });

  it('should not be confused by non-numeric suffixes', () => {
    const collisions = ['breaking-news', 'breaking-news-today'];
    expect(resolveSlugCollisions('breaking-news', collisions)).toEqual(
      'breaking-news-2',
    );
  });

  it('should handle double-digit suffixes', () => {
    const collisions = ['breaking-news'];
    for (let i = 2; i <= 10; i++) {
      collisions.push(`breaking-news-${i}`);
    }
    expect(resolveSlugCollisions('breaking-news', collisions)).toEqual(
      'breaking-news-11',
    );
  });

  it('should handle titles that end in a number', () => {
    expect(
      resolveSlugCollisions('how-to-be-number-1', ['how-to-be-number-1']),
    ).toEqual('how-to-be-number-1-2');
  });

  it('should handle titles with adjacent numbers', () => {
    expect(
      resolveSlugCollisions('explaining-6-7', ['explaining-6-7']),
    ).toEqual('explaining-6-7-2');
  });

  it('should not treat prefix-matching non-suffixed slugs as collisions', () => {
    // 'breaking-newsletter' starts with 'breaking-news-' but is not a collision
    expect(
      resolveSlugCollisions('breaking-news', [
        'breaking-news',
        'breaking-newsletter',
      ]),
    ).toEqual('breaking-news-2');
  });

  it('should not be blocked by leading-zero suffixes', () => {
    // 'breaking-news-02' is not the same as 'breaking-news-2'
    expect(
      resolveSlugCollisions('breaking-news', [
        'breaking-news',
        'breaking-news-02',
      ]),
    ).toEqual('breaking-news-2');
  });

  it('should treat a base slug that itself ends in a number literally', () => {
    // base is 'breaking-news-2' (from title "Breaking News 2")
    // collision with itself should produce 'breaking-news-2-2', not 'breaking-news-3'
    expect(
      resolveSlugCollisions('breaking-news-2', ['breaking-news-2']),
    ).toEqual('breaking-news-2-2');
  });

});
