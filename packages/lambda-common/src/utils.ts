import { ApprovedItemAuthor } from 'content-common';

/**
 * Creates an array of ApprovedItemAuthor from a comma separated string of authors
 * @param authors comma separated string of authors ordered by contribution (from the Parser)
 * @return ApprovedItemAuthor[]
 */
export const mapAuthorToApprovedItemAuthor = (
  authors: string[],
): ApprovedItemAuthor[] => {
  return authors.map((author, index) => {
    return { name: author, sortOrder: index + 1 };
  });
};
