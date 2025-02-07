import { ApprovedItemAuthor } from 'content-common';

import { mapAuthorToApprovedItemAuthor } from './utils';

describe('utils', () => {
  describe('mapAuthorToApprovedItemAuthor', () => {
    it('should create an ApprovedItemAuthor[] from a string array of author names', async () => {
      const authors = mapAuthorToApprovedItemAuthor([
        'Rose Essential',
        'Floral Street',
      ]);
      const expectedAuthors: ApprovedItemAuthor[] = [
        {
          name: 'Rose Essential',
          sortOrder: 1,
        },
        {
          name: 'Floral Street',
          sortOrder: 2,
        },
      ];
      expect(authors).toEqual(expectedAuthors);
    });
  });
});
