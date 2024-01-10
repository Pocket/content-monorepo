module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|integration).ts'],
  // ignore aws_lambda & prospectapi-common - those modules run their own
  // tests independently
  testPathIgnorePatterns: ['/dist/', '/aws_lambda/', '/prospectapi-common/'],
  setupFiles: ['./jest.setup.js'],
  verbose: true,
};
