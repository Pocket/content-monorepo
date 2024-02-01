const cdktf = require('cdktf');
cdktf.Testing.setupJest();
// https://github.com/facebook/react-native/issues/35701#issuecomment-1847579429
Object.defineProperty(global, 'performance', {
    writable: true,
});

