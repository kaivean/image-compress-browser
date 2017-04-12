/**
 * @file 应用启动器
 * @author wukaifang
 */
'use strict';
const fs = require('fs');
const path = require('path');

const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const app = new Koa();
const router = new Router();

const ejs = require('ejs');

// 提供静态文件服务
app.use(serve(path.resolve(__dirname, '..')));

router.get('/', async function (ctx, next) {
    console.log('access： ', ctx.url);
    ctx.type="text/html; charset=utf-8";
    ctx.body = fs.readFileSync('./measurement/index.html', 'utf8');
    await next();
});

router.get('/report', async function (ctx, next) {
    console.log('access： ', ctx.url);
    const ejsStr = require('fs').readFileSync(__dirname + '/report.ejs', 'utf8');

    let jsonData = fs.readFileSync(path.resolve(__dirname, 'log.json'), 'utf8');
    console.log('pathname, json: ', jsonData);
    if (jsonData) {
        jsonData = JSON.parse(jsonData);
    }
    else {
        jsonData = {
            item: []
        };
    }

    const typeMap = {
        compressOrientDataurl: '压缩，自定义获取方位，输出DataUrl',
        compressOrientBlob: '压缩，自定义获取方位，输出Blob',
        compressExifDataurl: '压缩，Exif获取方位，输出DataUrl',
        compressExifBlob: '压缩，Exif获取方位，输出Blob',
        compressNo: '不压缩',
    };

    var list = jsonData.item;
    for (var i = 0; i < list.length; i++) {
        list[i]['type'] = typeMap[list[i]['type']];
    }

    var ret = ejs.render(ejsStr, {
        list: list
    });
    ctx.type="text/html; charset=utf-8";
    ctx.body = ret;
    await next();
});


router.get('/log', async function (ctx, next) {
    console.log('access：', ctx.url);
    let query = ctx.query;
    ctx.type="text/html; charset=utf-8";
    ctx.body = '';

    let json = fs.readFileSync(path.resolve(__dirname, 'log.json'), 'utf8');
    // console.log('pathname, json: ', json);
    if (json) {
        json = JSON.parse(json);
    }
    else {
        json = {
            item: []
        };
    }
    let arr = [];

    let field = ['phone', 'name', 'type', 'url', 'fileTo', 'toImg', 'toCanvas', 'rotate', 'canvasOut', 'upload','total',
    'oriWidth', 'oriHeight', 'newWidth', 'newHeight', 'oriSize','newSize', 'orientation'];
    let out = [];
    for (let i = 0; i < field.length; i++) {
        let item = {};
        item[field[i]] = query[field[i]];
        arr.push(item);
        out.push(query[field[i]]);
    }
    json.item.push(query);
    console.log(query);
    // console.log(JSON.stringify(json));
    fs.writeFileSync(path.resolve(__dirname, 'log.json'), JSON.stringify(json));

    await next();
});

// 使路由生效
app.use(router.routes()).use(router.allowedMethods());

// 启动后端, 不指定hostname，则通过localhost ,127.0.0.1 机器地址都可以访问
let port = 8848;

app.listen(port, function (error) {
    if (error) {
        console.error(error);
    }
    else {
        console.info('==> 🌎  Listening on port %s. Open up http://127.0.0.1:%s/ in your browser.', port, port);
    }
});

app.on('error', function (err, ctx) {
    console.log('server error', err, ctx);
});
