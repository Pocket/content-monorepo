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
