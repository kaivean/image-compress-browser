/**
 * @file 处理任务
 * @author kaivean(kaisey2012@163.com)
 */

import ployFillTobBlob from './ployFillTobBlob';
import getOrientation from './getOrientation';


function loadFileToImg(file, callback) {
    var URL = window.URL || window.webkitURL;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
        callback(img);
    };
    img.src = url;
}

function handleCanvas(img, orientation, callback) {
    ployFillTobBlob();

    var width = img.naturalWidth || img.width;
    var height = img.naturalHeight || img.height;
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
    canvas.toBlob(function (newFile) {
        callback(newFile, width, height);
    }, 'image/jpeg', 0.75);
}

function compressImage(ofile, ocallback) {
    var file = ofile || {};
    var callback = ocallback || function () {};

    var fileType = file.type || '';
    if (file.type !== 'image/jpeg') {
        return callback(ofile);
    }

    loadFileToImg(file, function (img) {
        if (img) {
            // 修复ios下压缩后图片显示不对
            getOrientation(file, function (orientation) {
                orientation = orientation || 1;
                if (orientation) {
                    handleCanvas(img, orientation, function (newFile, width, height) {
                        // 新图比旧图还大，就用旧图
                        var becomeLarge = file.size <= newFile.size;
                        var returnFile = newFile;
                        if (becomeLarge) {
                            returnFile = file
                        }
                        callback(returnFile);
                    });
                }
                else {
                    callback(ofile);
                }
            });
        }
        else {
            callback(ofile);
        }
    });
}

export default compressImage;
