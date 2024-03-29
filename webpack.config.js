const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  target: 'node',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './dist'),
    libraryTarget: 'commonjs2',
    libraryExport: 'default'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules|dist/,
      use: ['babel-loader']
    }]
  },
  plugins: [
    new UglifyJsPlugin(),
    new CleanWebpackPlugin()
  ],
  mode: 'none'
}
