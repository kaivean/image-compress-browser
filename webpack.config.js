/**
 * @file 逻辑
 * @author kaivean(kaivean@outlook.com)
 */

const path = require('path');
const webpack = require('webpack');

let plugins = [];
if (process.env.production) {
    plugins.push(
        // JS压缩
        new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            // sourceMap: options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)
            mangle: {
                screw_ie8: true,
                keep_fnames: true
            },
            compress: {
                screw_ie8: true
            },
            comments: false
        })
    );
}

module.exports = function () {
    return {
        entry: __dirname + '/src/index.js',
        output: {
            library: "compressImage",
            libraryTarget: "umd",
            filename: 'compressImage.js',
            path: path.resolve(__dirname, 'dist')
            // publicPath: '' // string
        },
        resolve: {
            // root: path.resolve('./src'),
            extensions: ['.js']
        },
        plugins: plugins,
        module: {
            // configuration regarding modules
            rules: [
                {
                    // test: /\.js$/,
                    // loader: 'file-loader',
                    // exclude: /node_modules/,
                    // options: {
                    //     presets: ['es2015', 'es2017', 'stage-3'],
                    //     plugins: [
                    //
                    //     ]
                    // }
                }
            ]
        }
    };
}
