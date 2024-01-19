import {
  deriveAuthors,
  deriveDomainName,
  deriveExcerpt,
  deriveImageUrl,
  derivePublisher,
  deriveTitle,
  toUnixTimestamp,
} from './lib';
import { ClientApiItem } from './types';

describe('lib', () => {
  describe('toUnixTimestamp', () => {
    it('should convert to a unix timestamp', () => {
      const now = new Date();

      const timestamp = toUnixTimestamp(now);

      const timestampBackToDate = new Date(timestamp * 1000);

      expect(timestampBackToDate.getUTCFullYear()).toEqual(
        now.getUTCFullYear(),
      );
      expect(timestampBackToDate.getUTCMonth()).toEqual(now.getUTCMonth());
      expect(timestampBackToDate.getUTCDate()).toEqual(now.getUTCDate());
      expect(timestampBackToDate.getUTCHours()).toEqual(now.getUTCHours());
      expect(timestampBackToDate.getUTCMinutes()).toEqual(now.getUTCMinutes());
      expect(timestampBackToDate.getUTCSeconds()).toEqual(now.getUTCSeconds());
    });

    it('should give a unix timestamp for now if no date provided', () => {
      const now = new Date();

      const timestamp = toUnixTimestamp();

      const timestampBackToDate = new Date(timestamp * 1000);

      expect(timestampBackToDate.getUTCFullYear()).toEqual(
        now.getUTCFullYear(),
      );
      expect(timestampBackToDate.getUTCMonth()).toEqual(now.getUTCMonth());
      expect(timestampBackToDate.getUTCDate()).toEqual(now.getUTCDate());
      expect(timestampBackToDate.getUTCHours()).toEqual(now.getUTCHours());
      expect(timestampBackToDate.getUTCMinutes()).toEqual(now.getUTCMinutes());
      expect(timestampBackToDate.getUTCSeconds()).toEqual(now.getUTCSeconds());
    });
  });

  describe('derivePublisher', () => {
    it('should return the syndicated publisher if exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/idk',
        syndicatedArticle: {
          authorNames: [],
          publisher: {
            name: 'The Daily Bugle',
            url: 'https://thedailybugle.com',
          },
          title: 'Silly As Needed',
        },
      };

      expect(derivePublisher(item)).toEqual('The Daily Bugle');
    });

    it('should return the domainMetadata publisher if exists', () => {
      const item: ClientApiItem = {
        domainMetadata: {
          name: 'The Daily Planet',
        },
        resolvedUrl: 'https://getpocket.com/idk',
      };

      expect(derivePublisher(item)).toEqual('The Daily Planet');
    });

    it('should return an empty string if no publisher exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/idk',
      };

      expect(derivePublisher(item)).toEqual('');
    });
  });

  describe('deriveDomainName', () => {
    it('should return the syndicated article domain if exists', () => {
      expect(
        deriveDomainName(
          'https://getpocket.com/idk',
          'https://thedailybugle.com/happy/reading/all',
        ),
      ).toEqual('thedailybugle.com');
    });

    it('should return the prospect domain if no syndicated url exists', () => {
      expect(
        deriveDomainName('https://thedailyplanet.com/some/article/here'),
      ).toEqual('thedailyplanet.com');
    });
  });

  describe('deriveAuthors', () => {
    describe('authors directly on the item (non-syndicated)', () => {
      it('should return a CSV for multiple authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
          authors: [
            { name: 'Samantha Irby' },
            { name: 'Questlove' },
            { name: 'Noam Chomsky' },
          ],
        };

        expect(deriveAuthors(item)).toEqual(
          'Samantha Irby,Questlove,Noam Chomsky',
        );
      });

      it('should remove preceding/trailing spaces in authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
          authors: [{ name: ' Samantha Irby ' }, { name: 'Questlove   ' }],
        };

        expect(deriveAuthors(item)).toEqual('Samantha Irby,Questlove');
      });

      it('should remove empty authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
          authors: [{ name: '' }, { name: 'Questlove' }],
        };

        expect(deriveAuthors(item)).toEqual('Questlove');
      });

      it('should return an empty string for no authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
        };

        expect(deriveAuthors(item)).toEqual('');
      });
    });

    describe('syndicated authors', () => {
      it('should return a CSV string for multiple authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
          syndicatedArticle: {
            authorNames: ['Octavia Butler', 'V.E. Schwab'],
            title: 'Silly As Needed',
          },
        };

        expect(deriveAuthors(item)).toEqual('Octavia Butler,V.E. Schwab');
      });

      it('should return an empty string for no authors', () => {
        const item: ClientApiItem = {
          resolvedUrl: 'https://getpocket.com/silly-as-needed',
          syndicatedArticle: {
            authorNames: [],
            title: 'Silly As Needed',
          },
        };

        expect(deriveAuthors(item)).toEqual('');
      });
    });
  });

  describe('deriveExcerpt', () => {
    it('should use the syndicated excerpt if it exists', () => {
      const item: ClientApiItem = {
        excerpt: 'All right meow, hand over your license and registration...',
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
        syndicatedArticle: {
          authorNames: [],
          excerpt: 'Your registraton? Hurry up meow.',
          title: 'Silly As Needed',
        },
      };

      expect(deriveExcerpt(item)).toEqual('Your registraton? Hurry up meow.');
    });

    it('should use the item excerpt if no syndicated excerpt exists', () => {
      const item: ClientApiItem = {
        excerpt: 'All right meow, hand over your license and registration...',
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
        syndicatedArticle: {
          authorNames: [],
          title: 'Silly As Needed',
        },
      };

      expect(deriveExcerpt(item)).toEqual(
        'All right meow, hand over your license and registration...',
      );
    });

    it('should return undefined if no excerpt exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
        syndicatedArticle: {
          authorNames: [],
          title: 'Silly As Needed',
        },
      };

      expect(deriveExcerpt(item)).toEqual(undefined);
    });
  });

  describe('deriveTitle', () => {
    it('should use the syndicated title if it exists', () => {
      const item: ClientApiItem = {
        title: 'Ragnarok',
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
        syndicatedArticle: {
          authorNames: [],
          title: 'Silly As Needed',
        },
      };

      expect(deriveTitle(item)).toEqual('Silly As Needed');
    });

    it('should use the item title if no syndicated title exists', () => {
      const item: ClientApiItem = {
        title: 'Ragnarok',
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
      };

      expect(deriveTitle(item)).toEqual('Ragnarok');
    });

    it('should return undefined if no title exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
      };

      expect(deriveTitle(item)).toEqual(undefined);
    });
  });

  describe('deriveImageUrl', () => {
    it('should use the syndicated image if it exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
        topImageUrl: 'https://www.placecage.com/g/300/200',
        syndicatedArticle: {
          authorNames: [],
          title: 'Silly As Needed',
          mainImage: 'https://www.placecage.com/g/300/300',
        },
      };

      expect(deriveImageUrl(item)).toEqual(
        'https://www.placecage.com/g/300/300',
      );
    });

    it('should use the item image if no syndicated title exists', () => {
      const item: ClientApiItem = {
        topImageUrl: 'https://www.placecage.com/g/300/200',
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
      };

      expect(deriveImageUrl(item)).toEqual(
        'https://www.placecage.com/g/300/200',
      );
    });

    it('should return undefined if no image exists', () => {
      const item: ClientApiItem = {
        resolvedUrl: 'https://getpocket.com/silly-as-needed',
      };

      expect(deriveImageUrl(item)).toEqual(undefined);
    });
  });
});
