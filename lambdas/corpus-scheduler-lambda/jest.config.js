let testPathIgnorePatterns;

switch (process.env.TEST_ENV) {
  case 'dist':
    testPathIgnorePatterns = ['/node_modules/'];
    break;
  default:
    testPathIgnorePatterns = ['/dist/'];
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|integration).ts'],
  testPathIgnorePatterns,
  setupFiles: ['./jest.setup.js'],
};
