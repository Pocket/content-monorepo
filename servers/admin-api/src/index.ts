import app from './server/main';

// The `listen` method launches a web server.
app.listen({ port: 4027 }, () =>
  console.log(`🚀 Server ready at http://localhost:4027`),
);
