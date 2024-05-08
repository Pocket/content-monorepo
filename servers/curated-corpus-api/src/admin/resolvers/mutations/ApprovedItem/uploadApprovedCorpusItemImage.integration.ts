import FormData from 'form-data';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '.prisma/client';

import { client } from '../../../../database/client';

import { clearDb } from '../../../../test/helpers';
import Upload from 'graphql-upload/Upload.js';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import { integrationTestsS3UrlPattern } from '../../../aws/upload.integration';

describe('mutations: ApprovedItem (uploadApprovedCorpusItemImage)', () => {
  let app: Express.Application;
  let db: PrismaClient;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  const testFilePath = __dirname + '/test-image.jpeg';

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));
    db = client();
    await clearDb(db);
  });

  afterAll(async () => {
    await server.stop();
    await db.$disconnect();
  });

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL}`,
  };

  beforeEach(async () => {
    await clearDb(db);

    writeFileSync(testFilePath, 'I am an image');
  });

  afterEach(() => {
    unlinkSync(testFilePath);
  });

  it.skip('it should execute the mutation without errors and return the s3 location url', async () => {
    /**
     * context about this skip:
     *
     * graphql multi-part form support via `graphql-upload` is being deprecated in apollo router.
     * So this is going to be deprecated soon in favor of uploading to presigned urls, and just
     * using graphql to negotiate that url.
     *
     * We also just had an incident associated with file uploads due to headers not being passed
     * through to collection-api via admin-api, and collection-api started rejecting these requests
     * during the apollo v4 migration, causing file uploads to fail in the curation tools.
     *
     * apollo v4 migration requires us to move most of our integration tests to express tests,
     * however, this particular test cannot be migrated without actually setting up an entire
     * `apollo-upload-client` stack, or digging into the implementation of `apollo-upload` and
     * reverse engineering enough to replicate the request. This implementation is a swing at that,
     * influenced by https://github.com/jaydenseric/graphql-upload/blob/master/graphqlUploadExpress.test.mjs,
     * however it does not work.
     *
     * This test doesn't prevent regression of the incident in curation tools (dependent on interplay
     * with admin-api gateway), and there are also file upload unit tests testing upload interfaces.
     *
     * Due to the amount of work required to migrate, pressure to deprecate this style of upload (apollo
     * router migration), and inability to automatically test with the gateway, this test is being skipped
     * and will rely on manual testing.
     *
     * Leaving the rough test stub here in place because we do want test coverage here once we move to
     * pre-signed urls, and in case we have to revisit this before we can deprecate.
     *
     * If we have a regression around image uploads and CSRF, ensure that the `apollo-require-preflight`
     * header is reaching this service as a first investigation.
     */
    const image: Upload = new Upload();

    image.resolve({
      filename: 'test.jpg',
      mimetype: 'image/jpeg',
      encoding: '7bit',
      createReadStream: () => createReadStream(testFilePath),
    });

    const body = new FormData();

    body.append('operations', JSON.stringify({ variables: { file: null } }));
    body.append('map', JSON.stringify({ 1: ['variables.file'] }));
    body.append('1', createReadStream(testFilePath));

    const result = await request(app).post(graphQLUrl).set(headers).send(body);

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).toHaveProperty('uploadApprovedCorpusItemImage');
    expect(result.body.data?.uploadApprovedCorpusItemImage.url).toMatch(
      integrationTestsS3UrlPattern,
    );
  });
});
