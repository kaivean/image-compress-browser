/**
 * @file fis conf
 */

fis.match('**', {
    release: false
});

fis.match('src/(*.js)', {
    // optimizer: fis.plugin('uglify-js'),
    // useHash: true,
    release: '$1'
});
