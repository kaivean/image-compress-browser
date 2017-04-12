/**
 * @file 处理任务
 * @author kaivean(kaisey2012@163.com)
 */

import ployFillTobBlob from './ployFillTobBlob';
import getOrientation from './getOrientation';

/**
 * Blob对象或File对象转换为Base64字符串
 *
 * @param {Blob|File} blob image Blob data
 * @param {Function} callback callback
 */
function blob2Base64(blob, callback) {
    var fr = new FileReader();

    fr.onload = function () {
        callback(null, this.result);
    };

    fr.onerror = function (err) {
        callback(err);
    };

    fr.readAsDataURL(blob);
}


function loadFileToImg(file, callback) {
    statData.fileTo = performance.now();

    if (statData.type.indexOf('Blob') > -1) {
        var URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(file);
        statData.fileTo = performance.now() - statData.fileTo;

        statData.toImg = performance.now();
        var img = new Image();
        img.onload = function () {
            statData.toImg = performance.now() - statData.toImg;
            callback(img);
        };

        img.src = url;
    }
    else {
        // 使用 FileReader
        var fr = new FileReader();
        fr.onload = function () {
            statData.fileTo = performance.now() - statData.fileTo;

            statData.toImg = performance.now();
            var dataUrl = this.result;
            var img = new Image();
            img.onload = function () {
                statData.toImg = performance.now() - statData.toImg;
                callback(img);
            };
            img.onerror = function () {
                callback();
            };
            img.src = dataUrl;
        };
        fr.onerror = function (err) {
            callback();
        };
        fr.readAsDataURL(file);
    }



}

function handleCanvas(img, orientation, callback) {
    ployFillTobBlob();

    var width = img.naturalWidth || img.width;
    var height = img.naturalHeight || img.height;
    if (orientation && ('5678'.indexOf(orientation) > -1)) {
        width = img.naturalHeight || img.height;
        height = img.naturalWidth || img.width;
    }

    statData.oriWidth = width;
    statData.oriHeight = height;

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

    statData.newWidth = width;
    statData.newHeight = height;

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    statData.rotate = performance.now();
    switch (orientation) {
        case 3:

            ctx.rotate(180 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 6:
            ctx.rotate(90 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 8:
            ctx.rotate(270 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, -height, 0, height, width);
            break;
        case 2:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, 0, 0, width, height);
            break;
        case 4:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(180 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 5:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(90 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 7:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(270 * Math.PI / 180);
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, -height, 0, height, width);
            break;

        default:
            statData.rotate = performance.now() - statData.rotate;
            ctx.drawImage(img, 0, 0, width, height);
    }
    ctx.restore();

    statData.toCanvas = performance.now() - statData.toCanvas;


    statData.canvasOut = performance.now();


    if (statData.type.indexOf('Blob') > -1) {
        // 进行压缩, 压缩率 0.75
        canvas.toBlob(function (newFile) {
            statData.canvasOut = performance.now() - statData.canvasOut;
            callback(newFile, width, height);
        }, 'image/jpeg', 0.75);
    }
    else {
        // 进行压缩, 压缩率 0.75
        var dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        statData.canvasOut = performance.now() - statData.canvasOut;
        callback(dataUrl, width, height);
    }
}

function compressImage(ofile, ocallback) {
    var file = ofile || {};
    var callback = ocallback || function () {};

    var fileType = file.type || '';
    if (file.type !== 'image/jpeg') {
        return callback(ofile);
    }

    if (statData.type.indexOf('compressNo') > -1) {
        return callback(ofile);
    }

    loadFileToImg(file, function (img) {
        statData.oriSize = file.size;

        if (img) {
            // 修复ios下压缩后图片显示不对
            getOrientation(file, function (orientation) {
                statData.orientation = orientation;
                orientation = orientation || 1;
                if (orientation) {
                    statData.toCanvas = performance.now();
                    handleCanvas(img, orientation, function (newFile, width, height) {

                        if (statData.type.indexOf('Blob') > -1) {
                            // 新图比旧图还大，就用旧图
                            var becomeLarge = file.size <= newFile.size;
                            var returnFile = newFile;
                            if (becomeLarge) {
                                returnFile = file
                            }
                            statData.newSize = returnFile.size;
                            callback(returnFile);
                        }
                        else {
                            var dataUrl=newFile;
                            // 新图比旧图还大，就用旧图
                            var becomeLarge = img.src.size <= dataUrl.size;
                            if (becomeLarge) {
                                dataUrl = img.src;
                            }
                            statData.newSize = dataUrl.length;

                            var base64 = dataUrl.split('base64,')[1];
                            callback(base64, width, height, becomeLarge);
                        }
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
