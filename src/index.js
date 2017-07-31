/**
 * @file 处理任务
 * @author kaivean(kaisey2012@163.com)
 */

// 代码规范说明： 仅采用rollup的import方便打包而已，可以方便生成iife模块兼容代码，没有使用es6语法，因此变量还是var
/* eslint-disable no-var */

import canvasToBlob from './canvasToBlob';
import getOrientation from './getOrientation';

/**
 * 把blob对象转为img对象
 *
 * @param {File} file 文件
 * @param {Function} callback 回调
 */
function loadFileToImg(file, callback) {
    var URL = window.URL || window.webkitURL;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
        callback(img);
    };
    img.onerror = function () {
        callback();
    };
    img.src = url;
}

/**
 * 把图片化到canvas，并压缩输出成文件对象
 *
 * @param {Image} img 文件
 * @param {number} orientation 方位值
 * @param {Function} callback 回调
 */
function handleCanvas(img, orientation, callback) {
    var width = img.naturalWidth || img.width;
    var height = img.naturalHeight || img.height;

    // 如果图片原来是横向的，那么新的宽高就应该反着来，才能保持视觉不变
    if (orientation && ('5678'.indexOf(orientation) > -1)) {
        width = img.naturalHeight || img.height;
        height = img.naturalWidth || img.width;
    }

    // 如果图片大于1百万像素，计算压缩比并将大小压至100万以下
    var ratio = width * height / 1000000;
    if (ratio > 1) {
        ratio = Math.sqrt(ratio);
        width /= ratio;
        height /= ratio;
    }
    else {
        ratio = 1;
    }

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // 根据方位值，旋转canas，调整图片方位，免得显示时图片还是旋转的
    switch (orientation) {
        case 3:
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 6:
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 8:
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
            break;
        case 2:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, width, height);
            break;
        case 4:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 5:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 7:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
            break;

        default:
            ctx.drawImage(img, 0, 0, width, height);
    }
    ctx.restore();

    // 进行压缩, 压缩率 0.75
    canvasToBlob(canvas, function (newFile) {
        callback(newFile, width, height);
    }, 'image/jpeg', 0.75);
}

/**
 * 入口： 压缩图片，
 *
 * @param {File} ofile 文件
 * @param {Function} ocallback 压缩后回调
 * @return {undefined} 提前终止而已
 */
export default function compressImage(ofile, ocallback) {
    var file = ofile || {};
    var callback = ocallback || function () {};

    if (file.type !== 'image/jpeg') {
        return callback(ofile);
    }

    loadFileToImg(file, function (img) {
        if (img) {
            // 修复ios下压缩后图片显示不对
            getOrientation(file, function (orientation = 1) {
                if (orientation) {
                    handleCanvas(img, orientation, function (newFile, width, height) {
                        // toBlob可能失败
                        if (!newFile) {
                            newFile = file;
                        }
                        // 新图比旧图还大，就用旧图
                        var becomeLarge = file.size <= newFile.size;
                        var returnFile = newFile;
                        if (becomeLarge) {
                            returnFile = file;
                        }
                        // 把压缩file对象回传
                        callback(returnFile);
                    });
                }
                else {
                    // 压缩失败，回传
                    callback(ofile);
                }
            });
        }
        else {
            // 压缩失败，回传
            callback(ofile);
        }
    });
}
