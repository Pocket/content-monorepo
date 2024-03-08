const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'node', // Target environment
  // externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  resolve: {
    extensions: ['.ts', '.js'], // resolve all the modules other than index.ts
  },
  optimization: {
    minimize: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'), // output directory
    filename: 'index.js', // output file
    library: {
      type: 'commonjs2',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'source-map',
};
