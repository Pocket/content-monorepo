import { GraphQLRequest } from 'apollo-server-types';
import { AdminAPIUser } from '../jwtUtils';

/**
 * Extract first value from an http header. If array, first
 * element in array. If string, the string.
 */
export function extractHeader(header: string | string[]): string {
  if (header instanceof Array) {
    return header[0];
  } else {
    return header;
  }
}

/**
 * Copy the record values to the passed request object.
 * Mutates the request object inplace.
 */
export function addRecordToRequestHeader(
  record: Record<string, string>,
  request: GraphQLRequest,
): void {
  Object.entries(record).forEach(([key, value]) => {
    request.http.headers.set(key, value);
  });
}

/**
 * Add AdminAPIUser properties to request header.
 * The data added here are extracted from the JWT header
 * coming from AWS Cognito.
 * @param request
 * @param user
 */
export function buildRequestHeadersFromAdminAPIUser(
  request: GraphQLRequest,
  user: AdminAPIUser,
): GraphQLRequest {
  for (const property in user) {
    if (Object.prototype.hasOwnProperty.call(user, property)) {
      request.http.headers.set(property, user[property]);
    }
  }

  return request;
}
