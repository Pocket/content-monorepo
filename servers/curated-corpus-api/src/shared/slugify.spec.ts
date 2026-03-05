import { titleToSlug } from './slugify';

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

  it('should truncate long titles at a word boundary', () => {
    // 47 chars as a slug: "this-is-a-very-long-title-that-exceeds-the-maxi"
    const longTitle =
      'This Is a Very Long Title That Exceeds the Maximum Allowed Length for Slugs';
    const slug = titleToSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(46);
    // Should not end with a hyphen (truncated at word boundary)
    expect(slug).not.toMatch(/-$/);
  });

  it('should handle a title that is exactly at the limit', () => {
    // Create a title that slugifies to exactly 46 chars
    const title = 'abcdefghij abcdefghij abcdefghij abcdefghij abcd';
    const slug = titleToSlug(title);
    expect(slug.length).toBeLessThanOrEqual(46);
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
