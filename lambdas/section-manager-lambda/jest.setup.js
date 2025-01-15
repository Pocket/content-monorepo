// AWS_ENDPOINT is set in .docker/local.env
// this file is to provide a value when running tests outside of the container
process.env.AWS_ENDPOINT = process.env.AWS_ENDPOINT || 'http://localhost:4566';
process.env.AWS_ACCESS_KEY_ID = 'localstack-fake-id';
process.env.AWS_SECRET_ACCESS_KEY = 'localstack-fake-key';
process.env.AWS_DEFAULT_REGION = 'us-east-1';
process.env.AWS_REGION = 'us-east-1';

// https://github.com/facebook/react-native/issues/35701#issuecomment-1847579429
Object.defineProperty(global, 'performance', {
  writable: true,
});
