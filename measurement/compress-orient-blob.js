
define(function (require, exports) {

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

    function getStringFromDB(buffer, start, length) {
        var outstr = "";
        for (n = start; n < start+length; n++) {
            outstr += String.fromCharCode(buffer.getUint8(n));
        }
        return outstr;
    }
    function readOrientation(dataView, e1Offset) {
        if (getStringFromDB(dataView, e1Offset, 4) != "Exif") {
            return false;
        }
        var tiffOffset = e1Offset + 6;
        var bigEnd = false;
        if (dataView.getUint16(tiffOffset) == 0x4949) {
            bigEnd = false;
        }
        else if (dataView.getUint16(tiffOffset) == 0x4D4D) {
            bigEnd = true;
        }
        else {
            return false;
        }

        if (dataView.getUint16(tiffOffset + 2, !bigEnd) != 0x002A) {
            return false;
        }

        var firstIFDOffset = dataView.getUint32(tiffOffset + 4, !bigEnd);

        if (firstIFDOffset < 0x00000008) {
            return false;
        }

        var entryNumOffset = tiffOffset + firstIFDOffset;
        var entrieNum = dataView.getUint16(entryNumOffset, !bigEnd);//获取entry数量

        var entryOffset;

        console.log('entryNum', entrieNum);
        for (var i = 0; i < entrieNum; i++) {
            entryOffset = entryNumOffset + 2 + i * 12;
            console.log('entry' + i, dataView.getUint8(entryOffset, !bigEnd).toString(16).toUpperCase(),dataView.getUint8(entryOffset+1, !bigEnd).toString(16).toUpperCase());

            var sign = dataView.getUint16(entryOffset, !bigEnd);
            if (sign == 0x0112) {
                var type = dataView.getUint16(entryOffset + 2, !bigEnd);
                var numValues = dataView.getUint32(entryOffset + 4, !bigEnd);
                var valueOffset = dataView.getUint32(entryOffset + 8, !bigEnd) + tiffOffset;
                if (type === 3 && numValues === 1) {
                    console.log('Orientation', dataView.getUint16(entryOffset + 8, !bigEnd));
                    return dataView.getUint16(entryOffset + 8, !bigEnd);
                }
            }
        }
        return false;
    }

    function getFromFileBuffer(fileBuffer) {
        var dataView = new DataView(fileBuffer);

        if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
            return false; // not a valid jpeg
        }

        var offset = 2;
        var length = fileBuffer.byteLength;
        var marker;

        while (offset < length) {
            if (dataView.getUint8(offset) != 0xFF) {
                return false; // not a valid marker, something is wrong
            }

            marker = dataView.getUint8(offset + 1); // 偶数

            // we could implement handling for other markers here,
            // but we're only looking for 0xFFE1 for EXIF data
            if (marker == 225) { // App1开始标志，方向在该信息里
                return readOrientation(dataView, offset + 4);
                // offset += 2 + file.getShortAt(offset+2, true);
            }
            else {
                offset += 2 + dataView.getUint16(offset+2);
            }
        }
        return false;
    }

    function getOrientation(file, callback) {
        var fileReader = new FileReader();

        fileReader.onload = function(e) {
            var Orientation = getFromFileBuffer(e.target.result);
            $('#other').append('get Orientation by 自己计算 ' + Orientation);
            callback(Orientation);
        };

        fileReader.readAsArrayBuffer(file);
    }

    function loadFileToImg(file, callback) {
        stat.fileTo = performance.now();
        var URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(file);
        stat.fileTo = performance.now() - stat.fileTo;

        stat.toImg = performance.now();
        var img = new Image();
        img.onload = function () {
            stat.toImg = performance.now() - stat.toImg;
            callback(img);
        };

        img.src = url;


        // 使用 FileReader
        // var fr = new FileReader();
        // fr.onload = function () {
        //     stat.fileTo = performance.now() - stat.fileTo;
        //
        //     stat.toImg = performance.now();
        //     var dataUrl = this.result;
        //     var img = new Image();
        //     img.onload = function () {
        //         stat.toImg = performance.now() - stat.toImg;
        //         callback(img);
        //     };
        //     img.onerror = function () {
        //         callback();
        //     };
        //     img.src = dataUrl;
        // };
        // fr.onerror = function (err) {
        //     callback();
        // };
        // fr.readAsDataURL(file);
    }

    function canvasHandle(img, orientation, callback) {
        var width = img.naturalWidth || img.width;
        var height = img.naturalHeight || img.height;
        if (orientation && ('5678'.indexOf(orientation) > -1)) {
            width = img.naturalHeight || img.height;
            height = img.naturalWidth || img.width;
        }

        stat.oriWidth = width;
        stat.oriHeight = height;

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

        stat.newWidth = width;
        stat.newHeight = height;

        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // 如果图片像素大于100万则使用瓦片绘制
        // var count;
        // if ((count = width * height / 1000000) > 1) {
        //     count = ~~(Math.sqrt(count) + 1); // 计算要分成多少块瓦片
        //
        //     // 计算每块瓦片的宽和高
        //     var nw = ~~(width / count);
        //     var nh = ~~(height / count);
        //     var tCanvas = document.createElement('canvas');
        //     var tctx = tCanvas.getContext('2d');
        //     tCanvas.width = nw;
        //     tCanvas.height = nh;
        //
        //     for (var i = 0; i < count; i++) {
        //         for (var j = 0; j < count; j++) {
        //             tctx.drawImage(img, i * nw * ratio, j * nh * ratio, nw * ratio, nh * ratio, 0, 0, nw, nh);
        //             ctx.drawImage(tCanvas, i * nw, j * nh, nw, nh);
        //         }
        //     }
        // }
        // else {
        //     ctx.drawImage(img, 0, 0, width, height);
        // }

        ctx.save();
        stat.rotate = performance.now();
        switch (orientation) {
            case 3:

                ctx.rotate(180 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, -width, -height, width, height);
                break;
            case 6:
                ctx.rotate(90 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, 0, -width, height, width);
                break;
            case 8:
                ctx.rotate(270 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, -height, 0, height, width);
                break;
            case 2:
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, 0, 0, width, height);
                break;
            case 4:
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
                ctx.rotate(180 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, -width, -height, width, height);
                break;
            case 5:
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
                ctx.rotate(90 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, 0, -width, height, width);
                break;
            case 7:
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
                ctx.rotate(270 * Math.PI / 180);
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, -height, 0, height, width);
                break;

            default:
                stat.rotate = performance.now() - stat.rotate;
                ctx.drawImage(img, 0, 0, width, height);
        }
        ctx.restore();

        stat.toCanvas = performance.now() - stat.toCanvas;


        stat.canvasOut = performance.now();
        // 进行压缩, 压缩率 0.75
        canvas.toBlob(function (newFile) {
            stat.canvasOut = performance.now() - stat.canvasOut;
            callback(newFile, width, height);
        },'image/jpeg', 0.75);
    }

    exports = function (file, callback) {

        loadFileToImg(file, function (img) {
            stat.oriSize = file.size;
            getOrientation(file, function (orientation) {
                stat.orientation = orientation;

                stat.toCanvas = performance.now();
                canvasHandle(img, orientation, function (newFile, width, height) {
                    // 新图比旧图还大，就用旧图
                    var becomeLarge = file.size <= newFile.size;
                    var returnFile = newFile;
                    if (becomeLarge) {
                        returnFile = file
                    }
                    stat.newSize = returnFile.size;
                    callback(returnFile, width, height, becomeLarge);
                });
            });
        });
    }

    return exports;
})
