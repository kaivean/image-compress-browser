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

const typeMap = {
    compressOrientDataurl: '简版exif和DataUrl',
    compressOrientBlob: '简版exif和Blob',
    compressExifDataurl: 'Exif和DataUrl',
    compressExifBlob: 'Exif和Blob',
    compressNo: '不压缩',
};

let field = ['phone', 'name', 'type', 'url', 'fileTo', 'toImg', 'toCanvas', 'rotate', 'canvasOut', 'upload','total',
'oriWidth', 'oriHeight', 'newWidth', 'newHeight', 'oriSize','newSize', 'orientation'];
function handle(list, kind = 1) {
    let newList = [];
    let obj = {};

    let sign = 0;
    let n = 0;
    let c = 0;

    list.forEach(function (item, i) {
        console.log(item.type, typeMap[item.type] );
        list[i].type = typeMap[list[i].type] || list[i].type;

        let key;
        if (kind == 1) { // 只区分类型
            key = item.type;
        }
        else if (kind == 2) { // 只区分类型 和 系统
            key = item.os + '|' + item.type + '|';
        }
        else if (kind == 3) { // 只区分类型 和 系统 和 手机
            key = item.os + '|' + item.phone + '|' + item.type + '|' + item.name;
        }

        // let
        if (!obj.hasOwnProperty(key)) {
            obj[key] = [];
        }

        if (item.os == 'android') {
            sign = 1;
        }

        if (item.os == 'ios') {
            c++;
        }

        if (item.os == 'ios' && sign) {
            n++;

            // list[i]['phone'] = 'iphone 6、safari';
        }

        // console.log('os', item.os);

        obj[key].push(item);
    });

    for (let key in obj) {
        let arr = obj[key]; // os的数组，求均值
        let newItem = {};
        let theItem = arr[0];

        for (let attr in theItem) {
            if (/^[\.\d].*$/.test(theItem[attr])) {
                let total = 0;
                arr.forEach(function (item, i) {
                    total += +item[attr];
                });
                let aver = total / arr.length;
                if (aver.toString().indexOf('.') > -1) {
                    aver = aver.toFixed(2);
                }
                newItem[attr] = aver;
            }
            else {
                newItem[attr] = theItem[attr];
            }
        }

        obj[key] = newItem;

        newList.push(obj[key]);
    }

    return newList;
}

router.get('/report', async function (ctx, next) {
    console.log('access： ', ctx.url);
    const ejsStr = require('fs').readFileSync(__dirname + '/report.ejs', 'utf8');
    let dataFile = ctx.query.log || 'log';
    let jsonData = fs.readFileSync(path.resolve(__dirname,  dataFile + '.json'), 'utf8');
    // console.log('pathname, json: ', jsonData);
    if (jsonData) {
        jsonData = JSON.parse(jsonData);
    }
    else {
        jsonData = [];
    }

    // fs.writeFileSync(path.resolve(__dirname, 'log.json'), JSON.stringify(jsonData.item.slice(0, jsonData.item.length - 50)));

    var osTypeList = handle(jsonData, 1);
    let osTypeListConvertData = {};
    osTypeList.forEach(function (item, i) {
        for (let attr in item) {
            // let
            if (!osTypeListConvertData.hasOwnProperty(attr)) {
                osTypeListConvertData[attr] = [];
            }
            osTypeListConvertData[attr].push(item[attr]);
        }
    });

    // 对比图标数据，分为ios，安卓
    var osTypePhoneList = handle(jsonData, 2);
    let osTypePhoneListConvertData = {
        ios: {},
        android: {}
    };
    osTypePhoneList.forEach(function (item, i) {
        for (let attr in item) {
            // let
            if (!osTypePhoneListConvertData[item.os].hasOwnProperty(attr)) {
                osTypePhoneListConvertData[item.os][attr] = [];
            }
            osTypePhoneListConvertData[item.os][attr].push(item[attr]);
        }
    });


    var typeList = handle(jsonData, 3);

    var ret = ejs.render(ejsStr, {
        query: ctx.query,
        overallList: handle(jsonData, 1),
        typeList: typeList,
        osTypeListConvertData: osTypeListConvertData,
        osTypePhoneListConvertData: osTypePhoneListConvertData
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
        json = []
    }
    let arr = [];

    let out = [];
    for (let i = 0; i < field.length; i++) {
        let item = {};
        item[field[i]] = query[field[i]];
        arr.push(item);
        out.push(query[field[i]]);
    }
    json.push(query);
    console.log(query);
    // console.log(JSON.stringify(json));
    fs.writeFileSync(path.resolve(__dirname, 'log.json'), JSON.stringify(json));

    await next();
});

router.get('/error', async function (ctx, next) {

    let query = ctx.query;
    let info = query.info;
    info = JSON.parse(info || '{}');

    console.log('error info ', info);
    ctx.type="text/html; charset=utf-8";
    ctx.body = '';
    await next();
});

// 使路由生效
app.use(router.routes()).use(router.allowedMethods());

// 启动后端, 不指定hostname，则通过localhost ,127.0.0.1 机器地址都可以访问
let port = 8849;

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
