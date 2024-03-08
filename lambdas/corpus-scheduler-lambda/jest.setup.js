// Import dotenv to load environment variables
const dotenv = require('dotenv');

// Load environment variables from .docker/local.env
dotenv.config({ path: '../../.docker/local.env' });

// https://github.com/facebook/react-native/issues/35701#issuecomment-1847579429
Object.defineProperty(global, 'performance', {
    writable: true,
});
