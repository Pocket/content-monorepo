/**
 * Error thrown when an image url is valid
 */
export class InvalidImageUrl extends Error {
  constructor(message = 'Invalid image URL') {
    super(message);
  }
}
