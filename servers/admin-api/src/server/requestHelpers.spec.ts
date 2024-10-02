import {
  addRecordToRequestHeader,
  buildRequestHeadersFromAdminAPIUser,
  extractHeader,
} from './requestHelpers';
import { GraphQLRequest } from 'apollo-server-types';
import { Headers } from 'apollo-server-env';
import { AdminAPIUser } from '../jwtUtils';

describe('request helpers', () => {
  let request: GraphQLRequest;

  beforeEach(() => {
    request = {
      http: {
        url: 'testing.is.ok',
        method: 'POST',
        headers: new Headers(),
      },
    };
  });

  it("adds the Admin API user's properties and values as headers in a request", () => {
    const adminAPIUser: AdminAPIUser = {
      name: 'John Carr',
      username: 'ad|john.b.carr',
      groups: ['group1', 'group2'],
    };

    const subgraphRequest = buildRequestHeadersFromAdminAPIUser(
      request,
      adminAPIUser,
    );

    const headers = subgraphRequest.http.headers;
    expect(headers.get('name')).toEqual('John Carr');
    expect(headers.get('username')).toEqual('ad|john.b.carr');
    expect(headers.get('groups')).toEqual('group1,group2');
  });

  it('copies arbitrary key-value strings to request headers', () => {
    const arbitraryObject = {
      ice: 'cannon',
      tShirt: 'cube',
      'x-forwarded-for': 'myip',
      'apollo-require-preflight': 'true',
    };
    addRecordToRequestHeader(arbitraryObject, request);
    expect(request.http.headers.get('ice')).toEqual('cannon');
    expect(request.http.headers.get('tShirt')).toEqual('cube');
    expect(request.http.headers.get('x-forwarded-for')).toEqual('myip');
    expect(request.http.headers.get('apollo-require-preflight')).toEqual(
      'true',
    );
  });

  it('extracts first value from string array, or returns the string', () => {
    const someFakeHeaders = {
      yeet: 'yoink',
      words: ['yeet', 'yoink'],
    };
    expect(extractHeader(someFakeHeaders.yeet)).toEqual('yoink');
    expect(extractHeader(someFakeHeaders.words)).toEqual('yeet');
  });
});
