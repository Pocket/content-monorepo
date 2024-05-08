module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|integration).ts'],
  testPathIgnorePatterns: ['/dist/'],
  setupFiles: ['./jest.setup.js'], // each setupFile will be run once per test file
  globalSetup: './jest.global-setup.js', // will be triggered once before Jest is loaded
  displayName: 'curated-corpus-api',
  verbose: true,
};
