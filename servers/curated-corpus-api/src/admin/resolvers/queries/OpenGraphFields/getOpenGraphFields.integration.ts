import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';

import { GET_OPEN_GRAPH_FIELDS } from '../sample-queries.gql';
import { MozillaAccessGroup } from 'content-common';
import { startServer } from '../../../../express';
import { IAdminContext } from '../../../context';
import http from 'http';

const WEB_SERVER_PORT = 1234;

const getDummyPageWithOGDescription = (description) => {
  return (
    '<html> <head>' +
    (description &&
      `<meta property="og:description" 
  content="${description}" />`) +
    '</head>' +
    '</html>'
  );
};

const pagePath = 'testpage';
const missingPagePath = 'missingPage';
const hangingPagePath = 'hangingPage';
const emptyPagePath = 'emptyPage';

const sampleDescriptionText = 'this is a test';

const makeWebServer = () => {
  const host = 'localhost';
  const port = WEB_SERVER_PORT;
  const requestListener = async (req, res) => {
    const pathComponent = req.url.split('/').slice(-1)[0];

    if (pathComponent === pagePath) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDummyPageWithOGDescription(sampleDescriptionText));
      return;
    }
    if (pathComponent === emptyPagePath) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('');
      return;
    }
    if (pathComponent === hangingPagePath) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      await new Promise((f) => setTimeout(f, 500000));
      res.end(getDummyPageWithOGDescription(sampleDescriptionText));
      return;
    }
    res.writeHead(404);
    res.end();
  };
  const server = http.createServer(requestListener);
  server.listen(port, host, () => {
    console.log(`Test web server is running on http://${host}:${port}`);
  });
  return server;
};

describe('queries: OpenGraphFields (getOpenGraphFields)', () => {
  let app: Express.Application;
  let graphQLUrl: string;
  let server: ApolloServer<IAdminContext>;
  let webServer;

  const headers = {
    name: 'Test User',
    username: 'test.user@test.com',
    groups: `group1,group2,${MozillaAccessGroup.READONLY}`,
  };

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({ app, adminServer: server, adminUrl: graphQLUrl } = await startServer(0));

    webServer = makeWebServer();
  });

  afterAll(async () => {
    await server.stop();
    await webServer.close();
  });

  it('should get OG data', async () => {
    const serverURL = `http://localhost:${WEB_SERVER_PORT}/${pagePath}`;
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_OPEN_GRAPH_FIELDS),
        variables: {
          url: serverURL,
        },
      });
    expect(data?.getOpenGraphFields.description).toEqual(sampleDescriptionText);
  });

  it('missing page', async () => {
    const serverURL = `http://localhost:${WEB_SERVER_PORT}${missingPagePath}`;
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_OPEN_GRAPH_FIELDS),
        variables: {
          url: serverURL,
        },
      });
    expect(data?.getOpenGraphFields).toBeNull();
  });

  it('empty page', async () => {
    const serverURL = `http://localhost:${WEB_SERVER_PORT}${emptyPagePath}`;
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_OPEN_GRAPH_FIELDS),
        variables: {
          url: serverURL,
        },
      });
    expect(data?.getOpenGraphFields).toBeNull();
  });

  it('hanging page', async () => {
    const serverURL = `http://localhost:${WEB_SERVER_PORT}${hangingPagePath}`;
    const {
      body: { data },
    } = await request(app)
      .post(graphQLUrl)
      .set(headers)
      .send({
        query: print(GET_OPEN_GRAPH_FIELDS),
        variables: {
          url: serverURL,
        },
      });
    expect(data?.getOpenGraphFields).toBeNull();
  });
});
