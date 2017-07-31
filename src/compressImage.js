/**
 * @file 在浏览器实现图片压缩，解决ios上压缩后显示方向不对的问题
 * @author kaivean(kaisey2012@163.com)
 */

(function (global) {
    // 判断支持Blob，有兼容问题，实际使用一次，看Blob有没有问题，而不是仅判断window.Blob
    var hasBlobConstructor = window.Blob ? Boolean(new Blob()) : false;

    // 解决fecs 变量未定义问题，也可以让变量本地化，易被压缩
    var ArrayBuffer = window.ArrayBuffer;
    var Uint8Array = window.Uint8Array;
    var DataView = window.DataView;

    // 判断支持Uint8Array，有兼容问题，实际使用一次，而不是仅判断window.Uint8Array
    var hasArrayBufferViewSupport = (hasBlobConstructor && Uint8Array)
        ? new Blob([new Uint8Array(100)]).size === 100 : false;

    // 判断支持 BlobBuilder
    var BlobBuilder = window.BlobBuilder
        || window.WebKitBlobBuilder
        || window.MozBlobBuilder
        || window.MSBlobBuilder;

    var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;

    var loop = function () {};

    /**
     * canvas.toBlob的降级处理
     *
     * @param {string} dataURI 图片的dataURI
     * @return {Blob|undefined} 成功为blob对象，失败undefined
     */
    function dataURLtoBlob(dataURI) {
        if ((hasBlobConstructor || BlobBuilder) && window.atob && ArrayBuffer && Uint8Array) {
            var matches = dataURI.match(dataURIPattern);
            if (!matches) {
                throw new Error('invalid data URI');
            }
            // 默认类型 ： text/plain;charset=US-ASCII
            var mediaType = matches[2] ? matches[1] : 'text/plain' + (matches[3] || ';charset=US-ASCII');
            var isBase64 = !!matches[4];
            var dataString = dataURI.slice(matches[0].length);
            // 把base64 转换成二进制, 把 base64/URLEncoded数据组件 转换成二进制
            var byteString = isBase64 ? atob(dataString) : decodeURIComponent(dataString);

            // 把字符串转成 ArrayBuffer对象
            var arrayBuffer = new ArrayBuffer(byteString.length);
            var intArray = new Uint8Array(arrayBuffer);
            var len = byteString.length;
            for (var i = 0; i < len; i += 1) {
                intArray[i] = byteString.charCodeAt(i);
            }
            // 把ArrayBuffer 或 ArrayBufferView转成blob对象
            if (hasBlobConstructor) {
                return new Blob(
                    [hasArrayBufferViewSupport ? intArray : arrayBuffer], {
                        type: mediaType
                    }
                );
            }
            var bb = new BlobBuilder();
            bb.append(arrayBuffer);
            return bb.getBlob(mediaType);
        }
    }

    /**
     * 把canvas转换成blob，失败返回undefined
     *
     * @param {HTMLCanvasElement} canvas canvas
     * @param {string} type 图片类型
     * @param {float} quality 图片质量0-1
     * @param {Function} callback 回调
     * @return {undefined} 提前返回
     */
    function canvasToBlob(canvas, type, quality, callback) {
        // 本来就有toBlob，最好了
        if (canvas.toBlob) {
            return canvas.toBlob(callback, type, quality);
        }

        var res;
        if (canvas.mozGetAsFile) {
            if (quality && canvas.toDataURL && dataURLtoBlob) {
                res = dataURLtoBlob(canvas.toDataURL(type, quality));
            }
            else {
                res = canvas.mozGetAsFile('blob', type);
            }
        }
        else if (canvas.toDataURL && dataURLtoBlob) {
            res = dataURLtoBlob(canvas.toDataURL(type, quality));
        }
        callback(res);
    }

    /**
     * 把二进制数据转为字符串
     *
     * @param {Buffer} buffer 文件二进制
     * @param {number} start 读取二进制的开始位
     * @param {number} length  读取二进制的长度
     * @return {string} 二进制转为字符串
     */
    function getStringFromDB(buffer, start, length) {
        var outstr = '';
        var len = start + length;
        for (var n = start; n < len; n++) {
            outstr += String.fromCharCode(buffer.getUint8(n));
        }
        return outstr;
    }

    /**
     * 分析App1域，获取到方位值，此时找到app1域，方位值一般都存放这里
     *
     * @param {DataView} dataView 文件的DataView对象
     * @param {number} e1Offset app1域偏移值
     * @return {boolean|number} 如果获取方位值失败，返回false，否则返回方位值
     */
    function readOrientation(dataView, e1Offset) {
        // 图片的exif参数信息，都以Exif开头
        if (getStringFromDB(dataView, e1Offset, 4) !== 'Exif') {
            return;
        }
        // tiff数据从第6位开始
        var tiffOffset = e1Offset + 6;
        var bigEnd = false;

        // 图片方位值存储可能有大端和小端，因此先确定大小端，然后才能确定从左到右还是反过来读取出后续的数值
        if (dataView.getUint16(tiffOffset) === 0x4949) {
            bigEnd = false;
        }
        else if (dataView.getUint16(tiffOffset) === 0x4D4D) {
            bigEnd = true;
        }
        else {
            return;
        }

        // 002A 为约定的常量数值
        if (dataView.getUint16(tiffOffset + 2, !bigEnd) !== 0x002A) {
            return;
        }

        //  接下来的4B为TIFF数据相对TIFF开始位置的offset
        var firstIFDOffset = dataView.getUint32(tiffOffset + 4, !bigEnd);

        // 头部为8个字节所以这个值一般为8, 不为8就错误
        if (firstIFDOffset < 0x00000008) {
            return;
        }

        var entryNumOffset = tiffOffset + firstIFDOffset;

        // IFD的目录的每个记录指向一个IFD entry， 会有多个entry，每个entry存放不同的数据，如方位，宽，高等
        var entrieNum = dataView.getUint16(entryNumOffset, !bigEnd); // 获取entry数量

        var entryOffset;

        // 选好遍历每个entry
        for (var i = 0; i < entrieNum; i++) {
            // 每个IFD Entry（索引）有12个字节组成, 前2为是tag，第三位开始就是数据类型
            entryOffset = entryNumOffset + i * 12 + 2;
            // sign表示tag，
            var sign = dataView.getUint16(entryOffset, !bigEnd);
            // 方位值的tag由两个字节表示 0x0112
            if (sign === 0x0112) {
                // 数据类型有：1是BYTE，2是ASCII，3是SHORT等
                var type = dataView.getUint16(entryOffset + 2, !bigEnd);
                // 这里是数量
                var numValues = dataView.getUint32(entryOffset + 4, !bigEnd);
                if (type === 3 && numValues === 1) {
                    // 第8位开始后两个字节就是数值
                    return dataView.getUint16(entryOffset + 8, !bigEnd);
                }
            }
        }
    }

    /**
     * 分析图片字节，找到方位中值
     *
     * @param {Buffer} fileBuffer 文件的二进制对象
     * @return {boolean|number} 如果获取方位值失败，返回false，否则返回方位值
     */
    function getFromFileBuffer(fileBuffer) {
        // 建立dataview对象，方便后续好处理字节
        var dataView = new DataView(fileBuffer);

        // 0xFF 0xD8 代表jpeg图片，否则不是jpg图片
        if ((dataView.getUint8(0) !== 0xFF) || (dataView.getUint8(1) !== 0xD8)) {
            return;
        }

        var offset = 2;
        var length = fileBuffer.byteLength;
        var marker;

        // 开始去扫描图片二进制 字节，去分析得出方位值
        while (offset < length) {
            // 不是有效的标记， 图片格式有问题
            if (dataView.getUint8(offset) !== 0xFF) {
                return;
            }

            // 拿到offset的第二个字节,是App1域的开始标志
            marker = dataView.getUint8(offset + 1); // 偶数

            // 在此处只处理EXIF数据的 0xFFE1
            if (marker === 225) { // App1开始标志，方向在该信息里
                return readOrientation(dataView, offset + 4);
            }
            // 获取16位的数值，找到下一个图片的域的偏移位
            offset += 2 + dataView.getUint16(offset + 2);
        }
    }

    /**
     * 获取图片里的拍照时的方位，因为ios下，压缩后，拍照方位信息丢失，
     * 再到页面显示时，显示的图片就会被旋转，在这里获取方位后压缩前做处理
     *
     * @param {File|Blob} file 文件对象
     * @param {Function} callback 获取成功的返回
     */
    function getOrientation(file, callback) {
        var fileReader = new FileReader();
        fileReader.onload = function (e) {
            callback(getFromFileBuffer(e.target.result));
        };
        fileReader.onerror = function (e) {
            callback();
        };
        fileReader.readAsArrayBuffer(file);
    }

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
        canvasToBlob(canvas, 'image/jpeg', 0.75, function (newFile) {
            callback(newFile, width, height);
        });
    }

    /**
     * 入口： 压缩图片
     *
     * @param {File} ofile 文件
     * @param {Function} ocallback 压缩后回调
     * @return {undefined} 提前终止而已
     */
    function compressImage(ofile, ocallback) {
        var file = ofile || {};
        var callback = ocallback || loop;

        if (file.type !== 'image/jpeg') {
            return callback(ofile);
        }

        loadFileToImg(file, function (img) {
            if (!img) {
                // 压缩失败，回传
                return callback(ofile);
            }
            // 修复ios下压缩后图片显示不对
            getOrientation(file, function (orientation) {
                if (!orientation) {
                    // 压缩失败，回传
                    return callback(ofile);
                }
                handleCanvas(img, orientation, function (newFile, width, height) {
                    // toBlob可能失败
                    if (!newFile) {
                        newFile = file;
                    }
                    // 把压缩file对象回传,新图比旧图还大，就用旧图
                    callback(file.size <= newFile.size ? file : newFile);
                });
            });
        });
    }

    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = compressImage;
    }
    else if (typeof define === 'function' && define.amd) {
        define('compressImage', function () {
            return compressImage;
        });
    }
    else {
        global.compressImage = compressImage;
    }
}(this));
