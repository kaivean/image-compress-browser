// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

export default {
    entry: 'src/index.js',
    format: 'umd',
    moduleName: 'compressImage',
    dest: 'dist/compressImage.js',
    plugins: [
        resolve({
            jsnext: true,
            main: true,
            browser: true,
        }),
        commonjs(),
        (process.env.NODE_ENV === 'production' && uglify()),
    ]
};
