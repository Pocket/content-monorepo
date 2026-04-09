/**
 * Custom error class that preserves GraphQL error extension codes.
 * This allows callers to classify errors by their structured code
 * rather than fragile string matching on error messages.
 */
export class GraphQlApiError extends Error {
  readonly extensionCode: string;

  constructor(message: string, extensionCode: string) {
    super(message);
    this.name = 'GraphQlApiError';
    this.extensionCode = extensionCode;
  }
}
