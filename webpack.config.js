const path = require('path');
const pkg = require('./package.json');
const name = pkg.name;

module.exports = {
  entry: './src/index.js',
  output: {
     filename: `./${name}.min.js`,
     path: path.resolve(__dirname, 'dist'),
     libraryTarget: 'umd',
     library: name
  },
  mode: 'production',
};
