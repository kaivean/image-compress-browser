// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';



export default {
    entry: 'measurement/src/index.js',
    format: 'umd',
    moduleName: 'compressImage',
    dest: 'measurement/compressImage-full.js',
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
